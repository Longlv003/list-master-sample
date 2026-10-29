-- Migration 002: Add Scan Records Table for UNC Scanner and Dashboard

CREATE TABLE IF NOT EXISTS scan_records (
    id                  TEXT PRIMARY KEY, -- Hash md5 hoặc path normalize
    run_date            TEXT NOT NULL,    -- YYYY-MM-DD
    year                INTEGER NOT NULL,
    month               INTEGER NOT NULL,
    day                 INTEGER NOT NULL,
    item_code           TEXT NOT NULL,
    lot_id              TEXT NOT NULL,
    barcode_id          TEXT NOT NULL,
    job_name            TEXT NOT NULL,
    scan_machine_raw    TEXT,
    scan_machine_num    INTEGER,
    folder_scan_num     INTEGER NOT NULL,
    cvr_machine_num     INTEGER NOT NULL,
    folder_path         TEXT NOT NULL UNIQUE,
    log_a_path          TEXT,
    log_b_path          TEXT,
    auto_images_count   INTEGER DEFAULT 0,
    manual_images_count INTEGER DEFAULT 0,
    mapping_warning     INTEGER NOT NULL DEFAULT 0,
    warning_message     TEXT,
    source_status       TEXT NOT NULL DEFAULT 'online', -- 'online', 'offline', 'missing'
    csv_mtime           INTEGER,
    last_scanned_at     TEXT NOT NULL DEFAULT (datetime('now')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scan_records_run_date ON scan_records(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_scan_records_item_code ON scan_records(item_code);
CREATE INDEX IF NOT EXISTS idx_scan_records_barcode_id ON scan_records(barcode_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_lot_id ON scan_records(lot_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_scan_num ON scan_records(folder_scan_num);
CREATE INDEX IF NOT EXISTS idx_scan_records_cvr_num ON scan_records(cvr_machine_num);
CREATE INDEX IF NOT EXISTS idx_scan_records_mapping_warning ON scan_records(mapping_warning);
