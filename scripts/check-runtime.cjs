const path = require('node:path');
const root = path.resolve(__dirname, '..');
const [major, minor] = process.versions.node.split('.').map(Number);
try {
  if (major !== 22 || minor < 14) {
    throw new Error(`Expected Node.js 22.14+ (22.x), found ${process.version}. Use the bundled runtime/node/node-v22.14.0-win-x64/node.exe.`);
  }
  const Database = require(path.join(root, 'backend/node_modules/better-sqlite3'));
  const db = new Database(':memory:');
  db.prepare('SELECT 1').get();
  db.close();
  console.log(`[OK] Node ${process.version}, ${process.platform}/${process.arch}, ABI ${process.versions.modules}, SQLite native module loaded.`);
} catch (err) {
  console.error(`[RUNTIME ERROR] ${err.message}`);
  console.error('Copy the complete project including runtime and backend/node_modules. Do not replace Node with a different major version.');
  process.exitCode = 1;
}
