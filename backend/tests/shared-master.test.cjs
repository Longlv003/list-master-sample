const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
const { config } = require('../dist/config/config');
const { runMigrations } = require('../dist/infrastructure/database/migration.runner');
const { getDatabase, closeDatabase } = require('../dist/infrastructure/database/db');
const { masterSampleRepository: repo } = require('../dist/repositories/masterSample.repository');
const { MasterSampleExportService } = require('../dist/services/masterSampleExport.service');
const atomicFile = require('../dist/utils/atomicFile');

const makeItem = (id) => ({ id, sampleCode: 'SAMPLE-' + id, item: 'ITEM', lot: '1', barcodeId: '3',
  manufactureDate: '', expiryDate: '', deletedAt: null, deletedBy: null,
  createdAt: '2026-10-27T00:00:00.000Z', updatedAt: '2026-10-27T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'listmaster-shared-test-'));
  config.resolvedPaths.database = path.join(root, 'master.db');
  config.resolvedPaths.localMasterSampleJson = path.join(root, 'local.json');
  config.resolvedPaths.masterSampleJson = path.join(root, 'shared', 'master-sample.json');
  fs.mkdirSync(path.dirname(config.resolvedPaths.masterSampleJson));
  runMigrations();
  return root;
}
function cleanup(root) {
  closeDatabase();
  assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('listmaster-shared-test-'));
  fs.rmSync(root, { recursive: true, force: true });
}
async function waitFor(check) {
  const deadline = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for JSON export');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

test('SQLite data migrates once and stays authoritative over old, changed or broken JSON', async () => {
  const root = fixture();
  try {
    const item = makeItem('1');
    getDatabase().prepare('INSERT INTO master_sample_cache(source_path,data_json) VALUES (?,?)')
      .run(config.resolvedPaths.masterSampleJson, JSON.stringify([item]));
    fs.writeFileSync(config.resolvedPaths.localMasterSampleJson, JSON.stringify([makeItem('LOCAL-OLD')]));
    fs.writeFileSync(config.resolvedPaths.masterSampleJson, '{broken JSON');
    assert.equal(repo.getAll()[0].id, '1');
    const row = getDatabase().prepare('SELECT sample_code,item_code,lot,barcode_id FROM master_samples').get();
    assert.deepEqual(row, { sample_code: 'SAMPLE-1', item_code: 'ITEM', lot: '00001', barcode_id: '003' });
    closeDatabase();
    assert.equal(repo.getAll()[0].id, '1', 'SQLite records survive restart without reading any JSON');
    getDatabase().prepare('UPDATE master_sample_cache SET data_json=?').run(JSON.stringify([makeItem('STALE')]));
    repo.initialize();
    assert.equal(repo.getAll()[0].id, '1', 'legacy cache is not reapplied after migration');

    await Promise.all([repo.insert(makeItem('2')), repo.insert(makeItem('3'))]);
    assert.equal(repo.getAll().length, 3);
    await assert.rejects(repo.insert(makeItem('2')), /UNIQUE/);
    assert.equal(repo.getAll().length, 3, 'failed transaction rolls back instead of losing existing records');
    await repo.softDelete(['2'], 'test');
    assert.equal(repo.getAll().length, 2);
    assert.equal(repo.getAll(true).length, 3);
    await repo.restore(['2']);
    assert.equal(repo.getAll().length, 3);
  } finally { cleanup(root); }
});

test('empty SQLite never imports local or shared JSON', () => {
  const root = fixture();
  try {
    fs.writeFileSync(config.resolvedPaths.localMasterSampleJson, JSON.stringify([makeItem('LOCAL')]));
    fs.writeFileSync(config.resolvedPaths.masterSampleJson, JSON.stringify([makeItem('SHARED')]));
    assert.deepEqual(repo.getAll(), []);
  } finally { cleanup(root); }
});

test('JSON exports SQLite, repairs stale JSON, and retries failures without blocking edits', async () => {
  const root = fixture();
  const exporter = new MasterSampleExportService();
  const shared = config.resolvedPaths.masterSampleJson;
  try {
    await repo.saveAll([makeItem('1')]);
    fs.writeFileSync(shared, JSON.stringify([makeItem('EXTERNAL')]));
    await exporter.exportNow();
    assert.deepEqual(JSON.parse(fs.readFileSync(shared)), repo.getAll(true));
    assert.deepEqual(JSON.parse(fs.readFileSync(config.resolvedPaths.localMasterSampleJson)), repo.getAll(true));

    const unavailable = path.join(root, 'unavailable');
    fs.writeFileSync(unavailable, 'fixture blocks directory creation');
    config.resolvedPaths.masterSampleJson = path.join(unavailable, 'master-sample.json');
    await repo.update('1', { sampleCode: 'SAVED-OFFLINE' });
    await assert.rejects(exporter.exportNow());
    assert.equal(repo.getAll()[0].sampleCode, 'SAVED-OFFLINE');
    const failed = getDatabase().prepare('SELECT * FROM master_sample_export_state').get();
    assert.ok(failed.last_error);
    assert.ok(failed.revision > failed.exported_revision);
    closeDatabase();
    assert.equal(repo.getAll()[0].sampleCode, 'SAVED-OFFLINE');
    config.resolvedPaths.masterSampleJson = shared;
    await exporter.exportNow();
    assert.equal(JSON.parse(fs.readFileSync(shared))[0].sampleCode, 'SAVED-OFFLINE');
    const recovered = getDatabase().prepare('SELECT * FROM master_sample_export_state').get();
    assert.equal(recovered.last_error, null);
    assert.equal(recovered.revision, recovered.exported_revision);
  } finally { exporter.stop(); cleanup(root); }
});

test('automatic export catches edits made while UNC write is pending', async () => {
  const root = fixture();
  const exporter = new MasterSampleExportService();
  const originalWrite = atomicFile.writeJsonAtomic;
  let release;
  let entered;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { entered = resolve; });
  let held = true;
  const shared = config.resolvedPaths.masterSampleJson;
  atomicFile.writeJsonAtomic = async (target, items) => {
    if (target === shared && held) { entered(); await gate; }
    return originalWrite(target, items);
  };
  try {
    await repo.saveAll([makeItem('1')]);
    exporter.start();
    await ready;
    await repo.insert(makeItem('2'));
    assert.equal(repo.getAll().length, 2, 'SQLite reads and writes work before UNC is released');
    held = false;
    release();
    await waitFor(() => {
      const state = getDatabase().prepare('SELECT revision,exported_revision FROM master_sample_export_state').get();
      return state.revision === state.exported_revision;
    });
    assert.deepEqual(JSON.parse(fs.readFileSync(shared)).map(x => x.id), ['1', '2']);
  } finally {
    held = false; release(); exporter.stop();
    if (exporter.running) await exporter.running.catch(() => {});
    atomicFile.writeJsonAtomic = originalWrite;
    cleanup(root);
  }
});
