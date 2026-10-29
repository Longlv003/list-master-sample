CREATE TABLE IF NOT EXISTS audit_outbox (
  id TEXT PRIMARY KEY,
  entry_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
UPDATE users SET must_change_password=1 WHERE username='admin';
