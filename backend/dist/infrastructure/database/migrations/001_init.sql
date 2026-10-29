-- Schema Migration 001: Initial Database Schema for ListMaster

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    perm_add        INTEGER NOT NULL DEFAULT 0,
    perm_update     INTEGER NOT NULL DEFAULT 0,
    perm_delete     INTEGER NOT NULL DEFAULT 0,
    perm_restore    INTEGER NOT NULL DEFAULT 0,
    perm_manage_users    INTEGER NOT NULL DEFAULT 0,
    perm_view_audit_logs INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at   TEXT
);

-- Samples table
CREATE TABLE IF NOT EXISTS samples (
    id              TEXT PRIMARY KEY,
    no              INTEGER,
    sample_code     TEXT NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    item_code       TEXT,
    layer           TEXT,
    program_name    TEXT,
    made_date       TEXT,
    expiry_date     TEXT,
    comment         TEXT,
    excel_row_id    TEXT UNIQUE,
    deleted_at      TEXT,
    deleted_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    created_by      TEXT REFERENCES users(id),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by      TEXT REFERENCES users(id),
    last_synced_at  TEXT,
    sync_hash       TEXT
);

CREATE INDEX IF NOT EXISTS idx_samples_sample_code ON samples(sample_code);
CREATE INDEX IF NOT EXISTS idx_samples_expiry_date ON samples(expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_samples_deleted_at  ON samples(deleted_at);
CREATE INDEX IF NOT EXISTS idx_samples_excel_row_id ON samples(excel_row_id);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id          TEXT PRIMARY KEY,
    ip_address  TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    sid         TEXT PRIMARY KEY,
    sess        TEXT NOT NULL,
    expired_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired_at);

-- Excel Sync State (singleton row id=1)
CREATE TABLE IF NOT EXISTS excel_sync_state (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    status          TEXT NOT NULL DEFAULT 'idle',
    last_sync_at    TEXT,
    last_success_at TEXT,
    error_message   TEXT,
    conflict_count  INTEGER DEFAULT 0,
    baseline_hash   TEXT,
    retry_count     INTEGER DEFAULT 0
);

-- Excel Sync Baseline
CREATE TABLE IF NOT EXISTS excel_sync_baseline (
    sample_id   TEXT PRIMARY KEY REFERENCES samples(id) ON DELETE CASCADE,
    snapshot    TEXT NOT NULL,
    synced_at   TEXT NOT NULL
);

-- Excel Sync Conflicts
CREATE TABLE IF NOT EXISTS excel_sync_conflicts (
    id              TEXT PRIMARY KEY,
    sample_id       TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    field_name      TEXT NOT NULL,
    web_value       TEXT,
    excel_value     TEXT,
    baseline_value  TEXT,
    detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at     TEXT,
    resolved_by     TEXT REFERENCES users(id),
    resolution      TEXT
);

-- Initialize default row in excel_sync_state if not exists
INSERT OR IGNORE INTO excel_sync_state (id, status, conflict_count, retry_count)
VALUES (1, 'idle', 0, 0);
