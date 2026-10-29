const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { config, resolveDatabasePath } = require('../dist/config/config');

test('active configuration uses app.db and has no competing database path', () => {
  assert.equal(config.dbPath, './data/db/app.db');
  assert.equal(config.paths.database, undefined);
  assert.equal(config.resolvedPaths.database, path.resolve(config.projectRoot, 'data/db/app.db'));
});

test('legacy database setting works without being shadowed by a schema default', () => {
  const root = path.resolve('example');
  assert.equal(resolveDatabasePath(root, undefined, './data/db/legacy.db'), path.join(root, 'data/db/legacy.db'));
});

test('conflicting paths fail explicitly instead of silently opening the wrong database', () => {
  const root = path.resolve('example');
  assert.throws(() => resolveDatabasePath(root, './data/db/app.db', './data/db/other.db'), /Conflicting database paths/);
  assert.equal(resolveDatabasePath(root, './data/db/app.db', 'data/db/app.db'), path.join(root, 'data/db/app.db'));
});
