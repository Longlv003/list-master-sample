CREATE TABLE IF NOT EXISTS scan_root_state (
    root_path TEXT PRIMARY KEY,
    completed_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS master_sample_cache (
    source_path TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
