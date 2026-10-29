// Integration checks use a disposable project/database and never load production config.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {once} = require('node:events');
const root = path.resolve(__dirname, '..');
const area = path.join(root, '.test-output');
fs.mkdirSync(area, {recursive: true});
const fixture = fs.mkdtempSync(path.join(area, 'regression-'));
const backend = path.join(fixture, 'backend');
fs.mkdirSync(backend);
const source = path.join(fixture, '2026', 'Tháng 10');
fs.mkdirSync(source, {recursive: true});
const settings = {
  dbPath: path.join(fixture, 'data', 'app.db'), basePathUNC: source,
  masterSampleJsonPath: path.join(fixture, 'shared-master.json'), sessionSecret: '',
  scanIntervalSec: 7200, scanMachineMapping: {REVIEW_MACHINE: 5},
  session: {cookieName: 'review.sid'}, paths: {auditLog: path.join(fixture, 'logs')},
  server: {port: 3001, host: '127.0.0.1'}, logging: {level: 'silent'},
};
const configFile = path.join(backend, 'config.json');
fs.writeFileSync(configFile, JSON.stringify(settings));
process.env.LISTMASTER_CONFIG = configFile;
process.env.NODE_ENV = 'production';
function load(file) { return require(path.join(root, 'backend/dist', file)); }
let checks = 0;
function check(name) { checks++; console.log(`PASS ${checks}: ${name}`); }
let server, db, scanner, exporter, audit, maintenance;

(async () => {
  const {config} = load('config/config');
  assert.equal(config.scanIntervalSec, 7200);
  assert.equal(config.resolvedPaths.masterSampleJson, settings.masterSampleJsonPath);
  assert.ok(config.sessionSecret.length >= 64);
  const savedSecret = fs.readFileSync(path.join(fixture, 'data/session-secret.key'), 'utf8');
  assert.equal(config.sessionSecret, savedSecret);
  check('Isolated config, monthly root and persisted random session secret');
  load('infrastructure/database/migration.runner').runMigrations();
  db = load('infrastructure/database/db').getDatabase();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 8);
  check('All 8 migrations apply to fresh database');
  const {masterSampleService: masters} = load('services/masterSample.service');
  const {masterSampleRepository: repo} = load('repositories/masterSample.repository');
  const {scanFolderRepository: scans} = load('repositories/scanFolder.repository');
  const {dashboardService: dashboard} = load('services/dashboard.service');
  scanner = load('services/scanner.service').scannerService;
  exporter = load('services/masterSampleExport.service').masterSampleExporter;
  audit = load('services/audit.service').auditService;
  maintenance = load('services/maintenance.service').maintenanceService;
  const original = {sampleCode: 'M01', item: 'ITEM', lot: '79', barcodeId: '7', quantity: 1,
    manufactureDate: '2026-10-01', expiryDate: '2026-12-01', username: 'review'};
  const first = await masters.create(original);
  assert.equal(first.lot, '00079'); assert.equal(first.barcodeId, '007');
  await assert.rejects(masters.create({...original, quantity: -1}));
  await assert.rejects(masters.create({...original, expiryDate: '2026-02-30'}));
  await assert.rejects(masters.create({...original, manufactureDate: '2027-01-01'}));
  await assert.rejects(masters.create({...original, item: '   '}));
  await assert.rejects(masters.create({...original, sampleCode: 'OTHER'}), /cùng Item/);
  const second = await masters.create({...original, lot: '80'});
  assert.notEqual(first.id, second.id);
  await assert.rejects(masters.update(first.id, {expiryDate: 'invalid', username: 'review'}));
  await masters.update(first.id, {sampleCode: '', programName: '', layer: '', username: 'review'});
  assert.equal(repo.findById(first.id).sampleCode, '');
  await masters.update(first.id, {sampleCode: 'M01', username: 'review'});
  await masters.softDelete([first.id], 'review');
  const replacement = await masters.create(original);
  await assert.rejects(masters.restore([first.id], 'review'), /cùng Item/);
  await masters.softDelete([replacement.id], 'review'); await masters.restore([first.id], 'review');
  const saved = repo.getAll(true);
  await repo.saveAll([...saved, {...first, id: 'old-duplicate', sampleCode: 'OLD-CONFLICT'}]);
  // The dashboard must flag old data conflicts even if those rows predate uniqueness validation.
  const rawKey = load('utils/sampleIdentity').sampleIdentity(' item ', '79', '7');
  assert.equal(rawKey, load('utils/sampleIdentity').sampleIdentity('ITEM', '00079', '007'));
  await repo.saveAll(saved);
  check('Master validation, real dates, chronology, normalization, duplicate identity and clearing fields');

  const folder = path.join(source, '1. ITEM', '22-10', 'SCAN NO5-CVR47');
  fs.mkdirSync(folder, {recursive: true});
  const csvPath = path.join(folder, 'log_1A.csv');
  const csvData = 'AOI Machine,Lot ID,Panel ID,Job Name\nREVIEW_MACHINE,ITEM-00079,7,JOB\n';
  fs.writeFileSync(csvPath, csvData);
  let scan = await scanner.scan();
  assert.equal(scan.status, 'success'); assert.equal(scan.addedOrUpdated, 1);
  let record = scans.findWithFilter({}).records[0];
  assert.equal(record.barcode_id, '007');
  assert.equal(dashboard.getDashboardData({}).records[0].sample_code, 'M01');
  const snapshot = repo.getAll(true);
  await repo.saveAll([...snapshot, {...first, id: 'old-duplicate', sampleCode: 'OLD-CONFLICT'}]);
  assert.ok(dashboard.getDashboardData({}).records[0].match_warning);
  await repo.saveAll(snapshot);
  assert.equal((await scanner.scan()).addedOrUpdated, 0);
  check('Scanner and dashboard match padded identifiers; unchanged CSV skipped');
  config.scanMachineMapping.REVIEW_MACHINE = 6;
  await scanner.scan(); record = scans.findById(record.id);
  assert.equal(record.scan_machine_num, 6); assert.equal(record.mapping_warning, 1);
  assert.equal(dashboard.getExportData({hasWarning: true}).length, 1);
  delete config.scanMachineMapping.REVIEW_MACHINE;
  await scanner.scan(); assert.match(scans.findById(record.id).warning_message, /Chưa có mapping/);
  config.scanMachineMapping.REVIEW_MACHINE = 5;
  await scanner.scan();
  assert.equal(dashboard.getExportData({hasWarning: true}).length, 0);
  check('Mapping recomputed without CSV edits; unknown mappings warned; export uses warning filter');

  fs.writeFileSync(csvPath, 'AOI Machine,Lot ID,Panel ID,Job Name\nREVIEW_MACHINE,ITEM-00079,,\n');
  await scanner.scan(); record = scans.findById(record.id);
  assert.equal(record.barcode_id, ''); assert.equal(record.job_name, ''); assert.match(record.metadata_warning, /Thiếu metadata/);
  fs.writeFileSync(csvPath, csvData);
  fs.mkdirSync(path.join(folder, 'AUTO'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(path.join(folder, 'AUTO', 'one.png'), png);
  await scanner.scan();
  assert.equal(scans.findById(record.id).auto_images_count, 1);
  check('CSV blank cells clear stale metadata; nested AUTO image changes detected');

  const csvMulti = path.join(fixture, 'multi.csv');
  fs.writeFileSync(csvMulti, 'aoi machine,lot id,panel id,job name\nREVIEW_MACHINE,ITEM-79,7,"line 1\nline 2"\n');
  const parsed = await load('utils/csvParser').parseCsvFile(csvMulti, {firstRowOnly: true});
  assert.equal(parsed.firstRow.jobName, 'line 1\nline 2');
  assert.equal(load('utils/uncPathHelper').parseScanFolderPath(path.join(source, '31-02', 'SCAN NO5-CVR47')).isValid, false);
  check('CSV multiline/normalized headers and invalid calendar path handling');

  const otherMonth = {...scans.findById(record.id), id: 'other-month', folder_path: path.join(fixture, '2026', 'Tháng 9', 'SCAN NO5-CVR47')};
  scans.upsert(otherMonth);
  fs.renameSync(folder, path.join(path.dirname(folder), 'SCAN NO6-CVR47'));
  scan = await scanner.scan();
  assert.equal(scan.status, 'success'); assert.equal(scans.findById(record.id).source_status, 'missing');
  assert.equal(scans.findById('other-month').source_status, 'online');
  const previousCompletion = load('repositories/scanCache.repository').scanCacheRepository.lastCompleted(source);
  fs.renameSync(source, source + '-offline');
  scan = await scanner.scan(); assert.equal(scan.status, 'error'); assert.ok(scan.errors.length);
  assert.equal(load('repositories/scanCache.repository').scanCacheRepository.lastCompleted(source), previousCompletion);
  assert.equal(scans.findById('other-month').source_status, 'online');
  fs.renameSync(source + '-offline', source);
  const bad = path.join(source, '1. ITEM', '31-02', 'SCAN NO2-CVR44'); fs.mkdirSync(bad, {recursive: true});
  assert.equal((await scanner.scan()).status, 'partial');
  fs.renameSync(path.dirname(bad), path.join(fixture, 'invalid-date-folder'));
  scanner.start();
  const running = scanner.scan(); assert.equal(scanner.scan(), running); await running;
  assert.ok(new Date(scanner.getStatus().nextScanAt).getTime() - Date.now() > 7190000);
  await scanner.stop();
  check('Missing/offline/partial scoped to current root; only successful scan advances schedule; no overlap');

  const {userService} = load('services/user.service');
  const admin = userService.create({username: 'review-admin', password: 'ReviewPass123', display_name: 'Admin', perm_add: true, perm_update: true, perm_delete: true, perm_restore: true, perm_manage_users: true, perm_view_audit_logs: true});
  userService.create({username: 'review-manager', password: 'ReviewPass123', display_name: 'Manager', perm_manage_users: true});
  assert.throws(() => userService.toggleActive(admin.id), /quản trị viên/);
  assert.throws(() => userService.update(admin.id, {perm_delete: false}), /quản trị viên/);
  check('Last active administrator cannot be disabled or demoted');
  server = load('app').createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const request = (route, body, cookie, extra = {}) => fetch(url + '/api/v1' + route, {method: body === undefined ? 'GET' : 'POST', headers: {'content-type': 'application/json', ...(cookie ? {cookie} : {}), ...extra}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  const login = async username => {
    const response = await request('/auth/login', {username, password: 'ReviewPass123'});
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  };
  const managerCookie = await login('review-manager');
  let response = await fetch(url + '/api/master-samples', {method: 'DELETE', headers: {'content-type': 'application/json', cookie: managerCookie}, body: JSON.stringify({ids: [first.id]})});
  assert.equal(response.status, 403);
  const cookie = await login('review-admin'); assert.match(cookie, /^review\.sid=/);
  assert.notEqual(await login('review-admin'), cookie);
  response = await request('/master-samples', {...original, item: 'HTTP', lot: '90'}, cookie);
  assert.equal(response.status, 201); const httpMaster = (await response.json()).data;
  response = await fetch(url + '/api/master-samples/' + httpMaster.id, {method: 'PUT', headers: {'content-type': 'application/json', cookie}, body: JSON.stringify({sampleCode: 'HTTP-UPDATED'})});
  assert.equal(response.status, 200);
  response = await fetch(url + '/api/master-samples', {method: 'DELETE', headers: {'content-type': 'application/json', cookie}, body: JSON.stringify({ids: [httpMaster.id]})});
  assert.equal(response.status, 200);
  response = await request('/master-samples/restore', {ids: [httpMaster.id]}, cookie); assert.equal(response.status, 200);
  response = await request('/master-samples', {...original, quantity: -1}, cookie); assert.equal(response.status, 400);
  response = await request('/master-samples', {...original, item: 'FORBIDDEN'}, cookie, {origin: 'https://evil.example'}); assert.equal(response.status, 403);
  response = await request('/samples?search=hash&searchFields=' + encodeURIComponent('(SELECT password_hash FROM users LIMIT 1)')); assert.equal(response.status, 400);
  response = await request('/master-samples?page=NaN'); assert.equal(response.status, 400);
  response = await request('/dashboard?fromDate=2026-02-30'); assert.equal(response.status, 400);
  check('HTTP permissions, regenerated configurable session cookie, input validation, origin restrictions and SQL whitelist');
  response = await request('/auth/logout', {}, cookie); assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /^review\.sid=/);
  const freshCookie = await login('review-admin');
  response = await request('/auth/me', undefined, freshCookie, {'x-forwarded-for': '8.8.8.8'}); assert.equal(response.status, 200);
  const context = load('middlewares/deviceContext.middleware');
  const fakeRequest = {ip: '127.0.0.1', socket: {remoteAddress: '127.0.0.1'}, headers: {'x-forwarded-for': '8.8.8.8'}};
  context.deviceContextMiddleware(fakeRequest, {}, () => {}); assert.equal(fakeRequest.deviceInfo.ip, '127.0.0.1');
  check('Custom logout cookie cleared and untrusted forwarded IP ignored');

  const online = scans.findWithFilter({}).records.find(item => item.source_status === 'online' && item.id !== 'other-month');
  response = await request('/images/view?recordId=' + online.id + '&fileName=log_1A.csv'); assert.equal(response.status, 403);
  response = await request('/images/view?recordId=' + online.id + '&subDir=AUTO&fileName=one.png'); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /image\/png/);
  assert.equal((await response.arrayBuffer()).byteLength, png.length);
  const images = await dashboard.getFolderImages(online.id); assert.match(images.autoImages[0].url, /v=/);
  response = await request('/images/view?recordId=' + online.id + '&fileName=' + encodeURIComponent('../one.png')); assert.equal(response.status, 403);
  check('Images reject CSV/traversal, stream PNG with correct MIME and versioned gallery URLs');

  const ExcelJS = require(path.join(root, 'backend/node_modules/exceljs'));
  response = await request('/dashboard/export?hasWarning=true'); assert.equal(response.status, 200);
  let workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  assert.equal(workbook.worksheets[0].rowCount - 1, dashboard.getExportData({hasWarning: true}).length);
  response = await request('/master-samples/export?search=HTTP'); assert.equal(response.status, 200);
  workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer())); assert.equal(workbook.worksheets[0].rowCount, 2);
  response = await request('/samples/export'); assert.equal(response.status, 200);
  response = await request('/sync/status'); assert.equal(response.status, 404);
  response = await request('/sync/trigger', {}, freshCookie); assert.equal(response.status, 404);
  check('All Excel actions download workbooks; removed sync APIs return 404');

  await audit.flush();
  let logs = await audit.query({action: 'master.create'}); assert.ok(logs.items.some(entry => entry.entity_id === httpMaster.id));
  for (const action of ['master.update', 'master.delete', 'master.restore']) {
    const events = await audit.query({action}); assert.ok(events.items.some(entry => entry.entity_id === httpMaster.id && entry.old_value && entry.new_value));
  }
  for (let index = 0; index < 250; index++) audit.log({action: 'review.export', ip: 'test', entity_type: 'test', entity_id: String(index), result: 'success'});
  response = await request('/audit/export?action=review.export', undefined, freshCookie); assert.equal(response.status, 200);
  assert.equal((await response.text()).trim().split('\n').length, 250);
  const logDir = config.resolvedPaths.auditLog;
  fs.writeFileSync(path.join(logDir, 'audit-2000-01.jsonl'), JSON.stringify({ts: '2000-01-01T23:59:59.000Z', action: 'date-boundary', ip: 'test', entity_type: 'test', result: 'success'}) + '\n');
  assert.equal((await audit.query({startDate: '2000-01-01T00:00:00.000Z', endDate: '2000-01-02T00:00:00.000Z'})).total, 1);
  check('Master audit recorded, export exceeds 200 rows and includes entire selected final day');

  const previousLogDir = config.resolvedPaths.auditLog;
  const blocked = path.join(fixture, 'blocked'); fs.writeFileSync(blocked, 'not a directory');
  config.resolvedPaths.auditLog = blocked;
  audit.log({action: 'review.retry', ip: 'test', entity_type: 'test', result: 'success'});
  await audit.flush().catch(() => {});
  assert.ok(db.prepare('SELECT count(*) AS n FROM audit_outbox').get().n > 0);
  config.resolvedPaths.auditLog = previousLogDir; await audit.flush();
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_outbox').get().n, 0);
  check('Failed audit write remains durable in SQLite and drains after recovery');

  await exporter.exportNow();
  assert.ok(JSON.parse(fs.readFileSync(settings.masterSampleJsonPath, 'utf8')).some(item => item.id === first.id));
  await masters.softDelete([first.id], 'review'); await exporter.exportNow();
  assert.ok(JSON.parse(fs.readFileSync(settings.masterSampleJsonPath, 'utf8')).find(item => item.id === first.id).deletedAt);
  await masters.restore([first.id], 'restorer'); assert.equal(repo.findById(first.id).updatedBy, 'restorer');
  const oldBackupDir = path.join(fixture, 'data/backups'); fs.mkdirSync(oldBackupDir);
  fs.writeFileSync(path.join(oldBackupDir, 'app-backup-1.db'), 'expired dummy backup');
  await maintenance.run(); await maintenance.run();
  assert.equal(maintenance.status.lastError, null); assert.ok(maintenance.status.lastBackupAt);
  assert.equal(fs.existsSync(path.join(oldBackupDir, 'app-backup-1.db')), false);
  assert.equal(fs.existsSync(path.join(logDir, 'audit-2000-01.jsonl')), false);
  const backupFile = fs.readdirSync(oldBackupDir).find(name => /\.db$/.test(name));
  const Database = require(path.join(root, 'backend/node_modules/better-sqlite3'));
  const restored = new Database(path.join(oldBackupDir, backupFile), {readonly: true});
  assert.equal(restored.pragma('integrity_check', {simple: true}), 'ok');
  assert.ok(restored.prepare('SELECT count(*) AS n FROM master_samples').get().n >= 3); restored.close();
  check('One-way JSON export and restore attribution; backup opens intact and retention removes only eligible files');

  db.prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(admin.id);
  response = await request('/master-samples', {...original, item: 'BLOCKED'}, freshCookie); assert.equal(response.status, 403);
  response = await request('/auth/change-password', {currentPassword: 'ReviewPass123', newPassword: 'Replacement123'}, freshCookie); assert.equal(response.status, 200);
  const changedCookie = response.headers.get('set-cookie').split(';')[0]; assert.notEqual(changedCookie, freshCookie);
  response = await request('/auth/me', undefined, changedCookie); assert.equal((await response.json()).data.user.must_change_password, false);
  response = await request('/auth/me', undefined, freshCookie); assert.equal((await response.json()).data.user, null);
  check('Required password change, session rotation and invalidation of old sessions');
  for (let index = 0; index < 31; index++) response = await request('/auth/login', {username: 'missing-user', password: 'invalid'});
  assert.equal(response.status, 429);
  check('Login throttling rejects excessive attempts');
  const net = require('node:net');
  const {spawn} = require('node:child_process');
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const childPort = probe.address().port; await new Promise(resolve => probe.close(resolve));
  fs.writeFileSync(configFile, JSON.stringify({...settings, server: {port: childPort, host: '127.0.0.1'}}));
  const child = spawn(process.execPath, [path.join(root, 'backend/dist/main.js')], {cwd: root, env: {...process.env}, windowsHide: true});
  let childErrors = ''; child.stderr.on('data', chunk => {childErrors += chunk;}); child.stdout.resume();
  const childDone = once(child, 'exit');
  const stateFile = path.join(fixture, 'data/server-state.json');
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(stateFile) && Date.now() < deadline && child.exitCode === null) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(fs.existsSync(stateFile), 'Child server startup failed: ' + childErrors);
  const stopper = spawn(process.execPath, [path.join(root, 'scripts/stop-server.cjs')], {cwd: root, env: {...process.env}, windowsHide: true});
  stopper.stdout.resume(); stopper.stderr.on('data', chunk => {childErrors += chunk;});
  assert.equal((await once(stopper, 'exit'))[0], 0, childErrors);
  const timeout = setTimeout(() => child.kill(), 15000);
  const [childCode] = await childDone; clearTimeout(timeout);
  assert.equal(childCode, 0, childErrors);
  assert.equal(fs.existsSync(stateFile), false);
  check('Actual bootstrap, isolated background tasks and stop script complete graceful shutdown');
  console.log(`\n${checks} regression groups passed; all data isolated in ${fixture}`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
  if (scanner) await scanner.stop();
  if (exporter) await exporter.stop();
  if (maintenance) await maintenance.stop();
  if (audit) await audit.stop();
  if (db) load('infrastructure/database/db').closeDatabase();
  // Verified absolute target is the single disposable fixture created above.
  if (path.dirname(path.resolve(fixture)) !== path.resolve(area)) throw new Error('Unsafe test cleanup target');
  fs.rmSync(fixture, {recursive: true, force: true});
});
