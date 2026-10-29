-- SQLite owns the master list. JSON files are export artifacts only.
CREATE TABLE IF NOT EXISTS master_samples (
    id TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL,
    data_json TEXT NOT NULL CHECK (json_valid(data_json)),
    sample_code TEXT GENERATED ALWAYS AS (json_extract(data_json, '$.sampleCode')) VIRTUAL,
    item_code TEXT GENERATED ALWAYS AS (json_extract(data_json, '$.item')) VIRTUAL,
    lot TEXT GENERATED ALWAYS AS (json_extract(data_json, '$.lot')) VIRTUAL,
    barcode_id TEXT GENERATED ALWAYS AS (json_extract(data_json, '$.barcodeId')) VIRTUAL,
    CHECK (json_extract(data_json, '$.id') = id)
);
CREATE TABLE IF NOT EXISTS master_sample_export_state (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    initialized INTEGER NOT NULL DEFAULT 0,
    revision INTEGER NOT NULL DEFAULT 0,
    exported_revision INTEGER NOT NULL DEFAULT -1,
    last_export_at TEXT,
    last_error TEXT
);
INSERT OR IGNORE INTO master_sample_export_state (singleton) VALUES (1);
