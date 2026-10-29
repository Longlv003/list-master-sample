import fs from 'fs';
import path from 'path';
import { getDatabase } from './db';
import { logger } from '../logger/logger';

export function runMigrations(): void {
  const db = getDatabase();

  // Ensure migration table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Migrations directory does not exist: ${migrationsDir}`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const getAppliedStmt = db.prepare('SELECT version FROM schema_migrations WHERE version = ?');
  const recordMigrationStmt = db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)');

  for (const file of files) {
    const match = file.match(/^(\d+)_(.*)\.sql$/);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    const name = match[2];

    const alreadyApplied = getAppliedStmt.get(version);
    if (alreadyApplied) {
      continue;
    }

    logger.info(`Applying database migration: ${file}...`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    const runInTransaction = db.transaction(() => {
      db.exec(sqlContent);
      recordMigrationStmt.run(version, name);
    });

    try {
      runInTransaction();
      logger.info(`Migration ${file} applied successfully.`);
    } catch (err) {
      logger.error({ err }, `Failed to execute migration ${file}`);
      throw err;
    }
  }
}
