"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const logger_1 = require("../logger/logger");
function runMigrations() {
    const db = (0, db_1.getDatabase)();
    // Ensure migration table exists
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
    const migrationsDir = path_1.default.resolve(__dirname, 'migrations');
    if (!fs_1.default.existsSync(migrationsDir)) {
        logger_1.logger.warn(`Migrations directory does not exist: ${migrationsDir}`);
        return;
    }
    const files = fs_1.default
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    const getAppliedStmt = db.prepare('SELECT version FROM schema_migrations WHERE version = ?');
    const recordMigrationStmt = db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)');
    for (const file of files) {
        const match = file.match(/^(\d+)_(.*)\.sql$/);
        if (!match)
            continue;
        const version = parseInt(match[1], 10);
        const name = match[2];
        const alreadyApplied = getAppliedStmt.get(version);
        if (alreadyApplied) {
            continue;
        }
        logger_1.logger.info(`Applying database migration: ${file}...`);
        const sqlContent = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf-8');
        const runInTransaction = db.transaction(() => {
            db.exec(sqlContent);
            recordMigrationStmt.run(version, name);
        });
        try {
            runInTransaction();
            logger_1.logger.info(`Migration ${file} applied successfully.`);
        }
        catch (err) {
            logger_1.logger.error({ err }, `Failed to execute migration ${file}`);
            throw err;
        }
    }
}
