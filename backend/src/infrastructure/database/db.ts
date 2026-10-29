import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/config';
import { logger } from '../logger/logger';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbFilePath = config.resolvedPaths.database;
  const dbDir = path.dirname(dbFilePath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory at: ${dbDir}`);
  }

  logger.info(`Connecting to SQLite database at: ${dbFilePath}`);
  dbInstance = new Database(dbFilePath, {
    // verbose: process.env.NODE_ENV === 'development' ? (sql) => logger.debug({ sql }, 'SQL Exec') : undefined
  });

  // Enable WAL mode for high concurrency
  dbInstance.pragma('journal_mode = WAL');
  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');
  // Busy timeout 5000ms
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    logger.info('Closing SQLite database connection');
    dbInstance.close();
    dbInstance = null;
  }
}
