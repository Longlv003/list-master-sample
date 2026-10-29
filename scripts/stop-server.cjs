const path = require('path');
const fs = require('fs');
process.chdir(path.join(__dirname, '..'));
const {config} = require('../backend/dist/config/config');
const stateFile = path.join(path.dirname(config.resolvedPaths.database), 'server-state.json');
(async () => {
  if (!fs.existsSync(stateFile)) { console.log('Không có thông tin server đang chạy.'); return; }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const response = await fetch(`http://127.0.0.1:${state.port}/api/system/shutdown`, {method: 'POST', headers: {authorization: `Bearer ${state.token}`}, signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(`Không thể dừng server: HTTP ${response.status}`);
  console.log('Đã yêu cầu dừng mềm. Server sẽ đóng sau khi hoàn tất tác vụ đang chạy.');
})().catch(err => {console.error(err.message); process.exitCode = 1;});
