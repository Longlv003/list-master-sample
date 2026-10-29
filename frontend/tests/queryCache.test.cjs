const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/services/queryCache.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file);
const { reconcile, getQueryEntry, refreshQuery, clearQueryCache, tabState } = compiled.exports;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('reconcile adds, removes, edits and reorders rows while retaining equal rows', () => {
  const previous = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 }];
  const next = reconcile(previous, [{ id: 'c', value: 3 }, { id: 'a', value: 4 }, { id: 'd', value: 5 }]);
  assert.deepEqual(next.map((row) => row.id), ['c', 'a', 'd']);
  assert.equal(next[0], previous[2]);
  assert.notEqual(next[1], previous[0]);
  assert.equal(reconcile(next, JSON.parse(JSON.stringify(next))), next);
});

test('cached data stays visible during refresh and equal responses do not notify UI', async () => {
  clearQueryCache();
  await refreshQuery('dashboard', async () => ({ items: [{ id: 'a', value: 1 }], total: 1 }));
  const entry = getQueryEntry('dashboard');
  const snapshot = entry.snapshot;
  let notifications = 0;
  entry.listeners.add(() => notifications++);
  const pending = deferred();
  const refresh = refreshQuery('dashboard', () => pending.promise);
  assert.equal(entry.snapshot, snapshot);
  assert.equal(entry.snapshot.isLoading, false);
  pending.resolve({ items: [{ id: 'a', value: 1 }], total: 1 });
  await refresh;
  assert.equal(entry.snapshot, snapshot);
  assert.equal(notifications, 0);
});

test('background errors retain data and report the error', async () => {
  clearQueryCache();
  await refreshQuery('users', async () => ['existing']);
  const snapshot = getQueryEntry('users').snapshot;
  let error;
  await refreshQuery('users', async () => { throw new Error('offline'); }, (value) => { error = value; });
  assert.equal(error.message, 'offline');
  assert.equal(getQueryEntry('users').snapshot, snapshot);
});

test('a late response cannot overwrite a newer response or another filter', async () => {
  clearQueryCache();
  const first = deferred();
  const old = refreshQuery('samples:one', () => first.promise);
  await refreshQuery('samples:one', async () => ['new']);
  await refreshQuery('samples:two', async () => ['other filter']);
  first.resolve(['old']);
  await old;
  assert.deepEqual(getQueryEntry('samples:one').snapshot.data, ['new']);
  assert.deepEqual(getQueryEntry('samples:two').snapshot.data, ['other filter']);
});

test('switching accounts clears tab state and ignores old in-flight responses', async () => {
  clearQueryCache();
  tabState.set('audit.page', 3);
  const pending = deferred();
  const old = refreshQuery('audit', () => pending.promise);
  clearQueryCache();
  await refreshQuery('audit', async () => ['new account']);
  pending.resolve(['previous account']);
  await old;
  assert.equal(tabState.size, 0);
  assert.deepEqual(getQueryEntry('audit').snapshot.data, ['new account']);
});

test('StrictMode effect replay and simultaneous consumers share one pending request', async () => {
  clearQueryCache();
  const pending = deferred();
  let calls = 0;
  const load = () => { calls++; return pending.promise; };
  const firstMount = refreshQuery('dashboard', load, undefined, { deduplicate: true });
  const replayMount = refreshQuery('dashboard', load, undefined, { deduplicate: true });
  assert.equal(firstMount, replayMount);
  await Promise.resolve();
  assert.equal(calls, 1);
  pending.resolve(['result']);
  await Promise.all([firstMount, replayMount]);
  assert.deepEqual(getQueryEntry('dashboard').snapshot.data, ['result']);
  await refreshQuery('dashboard', async () => { calls++; return ['updated']; }, undefined, { deduplicate: true });
  assert.equal(calls, 2, 'returning to the tab later still revalidates');
});

test('failed requests release the shared slot so retry can fetch again', async () => {
  clearQueryCache();
  await refreshQuery('users', () => { throw new Error('offline'); }, undefined, { deduplicate: true });
  assert.equal(getQueryEntry('users').inFlight, undefined);
  await refreshQuery('users', async () => ['recovered'], undefined, { deduplicate: true });
  assert.deepEqual(getQueryEntry('users').snapshot.data, ['recovered']);
});

test('post-mutation refresh supersedes an older read and remains available to shared consumers', async () => {
  clearQueryCache();
  const oldResponse = deferred();
  const newResponse = deferred();
  const old = refreshQuery('samples', () => oldResponse.promise, undefined, { deduplicate: true });
  const afterMutation = refreshQuery('samples', () => newResponse.promise);
  oldResponse.resolve(['before mutation']);
  await old;
  let unexpectedCalls = 0;
  const joined = refreshQuery('samples', async () => { unexpectedCalls++; return []; }, undefined, { deduplicate: true });
  assert.equal(joined, afterMutation);
  assert.equal(unexpectedCalls, 0);
  newResponse.resolve(['after mutation']);
  await joined;
  assert.deepEqual(getQueryEntry('samples').snapshot.data, ['after mutation']);
});
