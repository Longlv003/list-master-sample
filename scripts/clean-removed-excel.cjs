const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../backend/dist');
for (const relative of [
  'services/excel/excel.differ.js', 'services/excel/excel.reader.js', 'services/excel/excel.writer.js',
  'services/excel/excel.watcher.js', 'services/excel/excel.sync.service.js', 'controllers/sync.controller.js',
  'routes/sync.routes.js', 'repositories/syncState.repository.js', 'domain/entities/SyncState.js',
  'dtos/sync.dto.js', 'validators/sync.validator.js', 'scripts/init-excel.js', 'scripts/test-api.js',
]) {
  const target = path.resolve(root, relative);
  const inside = path.relative(root, target);
  if (path.isAbsolute(inside) || inside.startsWith('..' + path.sep)) throw new Error('Invalid build cleanup path');
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
