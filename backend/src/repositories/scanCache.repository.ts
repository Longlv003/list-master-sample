import { getDatabase } from '../infrastructure/database/db';

export interface DirectoryEntry {
  name: string;
  directory: boolean;
  file: boolean;
}

export const scanCacheRepository = {
  lastCompleted(root: string): number | undefined {
    const row = getDatabase().prepare('SELECT completed_at_ms FROM scan_root_state WHERE root_path = ?')
      .get(root) as { completed_at_ms: number } | undefined;
    return row?.completed_at_ms;
  },
  complete(root: string): void {
    getDatabase().prepare(`INSERT INTO scan_root_state VALUES (?, ?)
      ON CONFLICT(root_path) DO UPDATE SET completed_at_ms=excluded.completed_at_ms`).run(root, Date.now());
  },
  find(folderPath: string): { mtimeMs: number; ctimeMs: number; entries: DirectoryEntry[] } | undefined {
    const row = getDatabase().prepare(
      'SELECT mtime_ms, ctime_ms, entries_json FROM scan_directory_cache WHERE folder_path = ?',
    ).get(folderPath) as { mtime_ms: number; ctime_ms: number; entries_json: string } | undefined;
    if (!row) return undefined;
    try {
      return { mtimeMs: row.mtime_ms, ctimeMs: row.ctime_ms, entries: JSON.parse(row.entries_json) };
    } catch { return undefined; }
  },
  save(folderPath: string, mtimeMs: number, ctimeMs: number, entries: DirectoryEntry[]): void {
    getDatabase().prepare(`INSERT INTO scan_directory_cache VALUES (?, ?, ?, ?)
      ON CONFLICT(folder_path) DO UPDATE SET mtime_ms=excluded.mtime_ms,
      ctime_ms=excluded.ctime_ms, entries_json=excluded.entries_json`)
      .run(folderPath, mtimeMs, ctimeMs, JSON.stringify(entries));
  },
};
