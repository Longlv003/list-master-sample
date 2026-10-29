"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanCacheRepository = void 0;
const db_1 = require("../infrastructure/database/db");
exports.scanCacheRepository = {
    lastCompleted(root) {
        const row = (0, db_1.getDatabase)().prepare('SELECT completed_at_ms FROM scan_root_state WHERE root_path = ?')
            .get(root);
        return row?.completed_at_ms;
    },
    complete(root) {
        (0, db_1.getDatabase)().prepare(`INSERT INTO scan_root_state VALUES (?, ?)
      ON CONFLICT(root_path) DO UPDATE SET completed_at_ms=excluded.completed_at_ms`).run(root, Date.now());
    },
    find(folderPath) {
        const row = (0, db_1.getDatabase)().prepare('SELECT mtime_ms, ctime_ms, entries_json FROM scan_directory_cache WHERE folder_path = ?').get(folderPath);
        if (!row)
            return undefined;
        try {
            return { mtimeMs: row.mtime_ms, ctimeMs: row.ctime_ms, entries: JSON.parse(row.entries_json) };
        }
        catch {
            return undefined;
        }
    },
    save(folderPath, mtimeMs, ctimeMs, entries) {
        (0, db_1.getDatabase)().prepare(`INSERT INTO scan_directory_cache VALUES (?, ?, ?, ?)
      ON CONFLICT(folder_path) DO UPDATE SET mtime_ms=excluded.mtime_ms,
      ctime_ms=excluded.ctime_ms, entries_json=excluded.entries_json`)
            .run(folderPath, mtimeMs, ctimeMs, JSON.stringify(entries));
    },
};
