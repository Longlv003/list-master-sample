ALTER TABLE scan_records ADD COLUMN metadata_warning TEXT;
CREATE TABLE IF NOT EXISTS scan_attempts (
  root_path TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  errors_json TEXT NOT NULL
);
