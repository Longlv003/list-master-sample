const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/clipboard.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function browser(clipboard, copyAllowed = true) {
  const state = { copied: null, removed: false, restoredFocus: false };
  const textarea = {
    style: {}, focus() {}, select() {}, setSelectionRange() {},
    remove() { state.removed = true; },
  };
  const context = {
    exports: {}, navigator: { clipboard },
    document: {
      activeElement: { focus() { state.restoredFocus = true; } },
      getSelection: () => null,
      createElement: () => textarea,
      body: { appendChild() {} },
      execCommand(command) {
        assert.equal(command, 'copy');
        if (copyAllowed) state.copied = textarea.value;
        return copyAllowed;
      },
    },
  };
  vm.runInNewContext(source, context);
  return { copyText: context.exports.copyText, state };
}

test('LAN HTTP without navigator.clipboard copies the full UNC path', async () => {
  const { copyText, state } = browser(undefined);
  const unc = '\\\\server\\share\\Ảnh AOM\\SCAN NO5-CVR47';
  await copyText(unc);
  assert.equal(state.copied, unc);
  assert.equal(state.removed, true);
  assert.equal(state.restoredFocus, true);
});

test('denied Clipboard API falls back to copy command', async () => {
  const { copyText, state } = browser({ writeText: async () => { throw new Error('Permission denied'); } });
  await copyText('C:\\sample');
  assert.equal(state.copied, 'C:\\sample');
});

test('failed copy rejects instead of displaying false success and cleans up', async () => {
  const { copyText, state } = browser(undefined, false);
  await assert.rejects(copyText('C:\\sample'), /Copy command failed/);
  assert.equal(state.copied, null);
  assert.equal(state.removed, true);
  assert.equal(state.restoredFocus, true);
});
