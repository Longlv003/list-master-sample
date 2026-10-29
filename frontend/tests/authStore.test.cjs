const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/store/auth.store.ts');
const compiled = new Module(file, module);
compiled.paths = Module._nodeModulePaths(path.dirname(file));
const authApi = { getMe: null };
const originalRequire = compiled.require.bind(compiled);
compiled.require = (name) => {
  if (name === '../services/auth.service') return { authApi };
  if (name === '../services/queryCache') return { clearQueryCache() {} };
  return originalRequire(name);
};
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file);
const { useAuthStore } = compiled.exports;

test('replayed auth effects share /auth/me and release the request after success or failure', async () => {
  let calls = 0;
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  authApi.getMe = () => { calls++; return pending; };
  const first = useAuthStore.getState().checkAuth();
  const replay = useAuthStore.getState().checkAuth();
  assert.equal(first, replay);
  assert.equal(calls, 1);
  resolve({ user: { id: 'admin' } });
  await Promise.all([first, replay]);
  assert.equal(useAuthStore.getState().user.id, 'admin');
  assert.equal(useAuthStore.getState().isLoading, false);

  authApi.getMe = async () => { calls++; throw new Error('offline'); };
  await useAuthStore.getState().checkAuth();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().isLoading, false);

  authApi.getMe = async () => { calls++; return { user: { id: 'reconnected' } }; };
  await useAuthStore.getState().checkAuth();
  assert.equal(calls, 3);
  assert.equal(useAuthStore.getState().user.id, 'reconnected');
});
