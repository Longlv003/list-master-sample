const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
const { config } = require('../dist/config/config');
config.resolvedPaths.database = ':memory:';
require('../dist/infrastructure/database/migration.runner').runMigrations();
const { ScannerService } = require('../dist/services/scanner.service');
const { scanCacheRepository } = require('../dist/repositories/scanCache.repository');

test('scheduler waits for completion before scheduling the next scan and stops cleanly', async () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const scheduled = [];
  const cleared = [];
  global.setTimeout = (callback, delay) => {
    const timer = { callback, delay };
    scheduled.push(timer);
    return timer;
  };
  global.clearTimeout = timer => cleared.push(timer);
  const scanner = new ScannerService();
  let release;
  scanner.runScan = () => new Promise(resolve => { release = () => resolve({ scanned: 5, addedOrUpdated: 2 }); });
  try {
    scanner.start();
    scanner.start();
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].delay, 2000);
    const cycle = scheduled[0].callback();
    const joined = scanner.scan();
    assert.equal(scheduled.length, 1, 'no timer is scheduled while scan is running');
    release();
    assert.deepEqual(await joined, { scanned: 5, addedOrUpdated: 2 });
    await cycle;
    assert.equal(scheduled.length, 2);
    scanner.stop();
    assert.deepEqual(cleared, [scheduled[1]]);

    scanner.start();
    const lastCycle = scheduled[2].callback();
    scanner.stop();
    release();
    await lastCycle;
    assert.equal(scheduled.length, 3, 'stop during scan prevents rescheduling');
  } finally {
    scanner.stop();
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('restart before the 12-hour deadline waits instead of scanning immediately', () => {
  assert.equal(config.scanIntervalSec, 43200);
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const scheduled = [];
  global.setTimeout = (callback, delay) => { const timer = { callback, delay }; scheduled.push(timer); return timer; };
  global.clearTimeout = () => {};
  const scanner = new ScannerService();
  try {
    scanCacheRepository.complete(config.resolvedPaths.basePathUNC);
    scanner.start();
    assert.equal(scheduled.length, 1);
    assert.ok(scheduled[0].delay > 43195000 && scheduled[0].delay <= 43200000);
  } finally {
    scanner.stop();
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    require('../dist/infrastructure/database/db').closeDatabase();
  }
});
