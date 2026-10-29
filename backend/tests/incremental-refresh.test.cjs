const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
const { config } = require('../dist/config/config');
config.resolvedPaths.database = ':memory:';
const { runMigrations } = require('../dist/infrastructure/database/migration.runner');
const { closeDatabase } = require('../dist/infrastructure/database/db');
const { masterSampleRepository } = require('../dist/repositories/masterSample.repository');
const { masterSampleService } = require('../dist/services/masterSample.service');
const { scanFolderRepository } = require('../dist/repositories/scanFolder.repository');
const csv = require('../dist/utils/csvParser');
const originalParse = csv.parseCsvFile;
let csvReads = 0;
csv.parseCsvFile = (...args) => { csvReads++; return originalParse(...args); };
const { ScannerService } = require('../dist/services/scanner.service');

test('expiry warning includes today through day 7 and excludes day 8', () => {
  assert.equal(config.expiryWarningDays, 7);
  const originalGetAll = masterSampleRepository.getAll;
  masterSampleRepository.getAll = () => [-1, 0, 7, 8, 30].map((days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const expiryDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { id: String(days), item: 'ITEM', lot: '', barcodeId: 'B', expiryDate, deletedAt: null };
  });
  try {
    const items = masterSampleService.getList({}).items;
    assert.deepEqual(Object.fromEntries(items.map((item) => [item.id, item.status])), {
      '-1': 'expired', '0': 'expiring', '7': 'expiring', '8': 'valid', '30': 'valid',
    });
    assert.deepEqual(masterSampleService.getList({ status: 'expiring' }).items.map((item) => item.id), ['0', '7']);
  } finally { masterSampleRepository.getAll = originalGetAll; }
});

test('incremental scan finds deep additions and skips unchanged CSV content', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'listmaster-scanner-test-'));
  const uncRoot = path.join(root, 'unc');
  fs.mkdirSync(uncRoot);
  config.resolvedPaths.basePathUNC = uncRoot;
  config.resolvedPaths.database = path.join(root, 'cache.db');
  runMigrations();
  const scanner = new ScannerService();
  const parent = path.join(uncRoot, '2026', 'Tháng 10', '18. ITEM-CP', '25-10');
  const first = path.join(parent, 'SCAN NO3-CVR45');
  const makeFolder = (folder, barcode) => {
    fs.mkdirSync(path.join(folder, 'AUTO'), { recursive: true });
    fs.mkdirSync(path.join(folder, 'MANUAL'));
    fs.writeFileSync(path.join(folder, 'log_1A.csv'), `Lot ID,Panel ID,Job Name\nITEM-0001,${barcode},PROGRAM\n`);
    fs.writeFileSync(path.join(folder, 'AUTO', 'first.jpg'), 'image fixture');
  };
  try {
    makeFolder(first, 'FIRST');
    assert.equal((await scanner.scan()).addedOrUpdated, 1);
    assert.equal(csvReads, 1);
    assert.equal(scanFolderRepository.findByPath(first).barcode_id, 'FIRST');
    assert.equal((await scanner.scan()).addedOrUpdated, 0);
    assert.equal(csvReads, 1);

    // Existing ancestors retain their timestamps when a deeper child is added.
    const ancestor = path.dirname(parent);
    const before = fs.statSync(ancestor);
    const second = path.join(parent, 'SCAN NO5-CVR47');
    makeFolder(second, 'SECOND');
    fs.utimesSync(ancestor, before.atime, before.mtime);
    assert.equal((await scanner.scan()).addedOrUpdated, 1);
    assert.equal(scanFolderRepository.findByPath(second).barcode_id, 'SECOND');
    assert.equal(csvReads, 2);

    fs.writeFileSync(path.join(first, 'AUTO', 'new.jpg'), 'new image');
    fs.writeFileSync(path.join(first, 'MANUAL', 'new.png'), 'new image');
    assert.equal((await scanner.scan()).addedOrUpdated, 1);
    const updated = scanFolderRepository.findByPath(first);
    assert.equal(updated.auto_images_count, 2);
    assert.equal(updated.manual_images_count, 1);
    assert.equal(csvReads, 2, 'image additions must not reparse unchanged CSV');

    const csvPath = path.join(first, 'log_1A.csv');
    fs.writeFileSync(csvPath, 'Lot ID,Panel ID,Job Name\nITEM-0001,UPDATED,PROGRAM\n');
    const later = new Date(Date.now() + 2000);
    fs.utimesSync(csvPath, later, later);
    assert.equal((await scanner.scan()).addedOrUpdated, 1);
    assert.equal(scanFolderRepository.findByPath(first).barcode_id, 'UPDATED');
    assert.equal(csvReads, 3);
    assert.equal((await scanner.scan()).addedOrUpdated, 0);
    assert.equal(csvReads, 3);

    closeDatabase();
    const restarted = new ScannerService();
    const originalReaddir = fs.promises.readdir;
    let directoryReads = 0;
    fs.promises.readdir = (...args) => { directoryReads++; return originalReaddir(...args); };
    try {
      const running = restarted.scan();
      assert.equal(restarted.scan(), running, 'concurrent refresh joins the same scan');
      assert.equal(restarted.getStatus().running, true);
      assert.equal(scanFolderRepository.findByPath(first).barcode_id, 'UPDATED', 'SQLite is readable during scan');
      assert.equal((await running).addedOrUpdated, 0);
      assert.equal(restarted.getStatus().running, false);
      assert.equal(directoryReads, 0, 'directory listings persist across database close and reopen');
    } finally { fs.promises.readdir = originalReaddir; }
    assert.equal(csvReads, 3, 'server restart retains existing database scan results');

    // UNC I/O must yield so requests can still read SQLite while a network stat is pending.
    const originalStat = fs.promises.stat;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    fs.promises.stat = async (...args) => { await gate; return originalStat(...args); };
    try {
      const pending = restarted.scan();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(restarted.getStatus().running, true);
      assert.equal(scanFolderRepository.findWithFilter({}).total, 2);
      release();
      await pending;
    } finally { release(); fs.promises.stat = originalStat; }
  } finally {
    closeDatabase();
    // Only remove the generated fixture directly inside the OS temporary directory.
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('listmaster-scanner-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
