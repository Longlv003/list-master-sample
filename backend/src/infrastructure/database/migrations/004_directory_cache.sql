CREATE TABLE IF NOT EXISTS scan_directory_cache (
    folder_path TEXT PRIMARY KEY,
    mtime_ms REAL NOT NULL,
    ctime_ms REAL NOT NULL,
    entries_json TEXT NOT NULL
);
ALTER TABLE scan_records ADD COLUMN csv_signature TEXT;
