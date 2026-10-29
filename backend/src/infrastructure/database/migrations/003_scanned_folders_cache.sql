-- Migration 003: Track scanned directories mtime for ultra-fast incremental scanning

CREATE TABLE IF NOT EXISTS scanned_folders_cache (
    folder_path TEXT PRIMARY KEY,
    mtime_ms    INTEGER NOT NULL,
    last_scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scanned_folders_path ON scanned_folders_cache(folder_path);
