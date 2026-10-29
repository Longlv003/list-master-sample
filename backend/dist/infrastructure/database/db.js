"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../../config/config");
const logger_1 = require("../logger/logger");
let dbInstance = null;
function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    const dbFilePath = config_1.config.resolvedPaths.database;
    const dbDir = path_1.default.dirname(dbFilePath);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
        logger_1.logger.info(`Created database directory at: ${dbDir}`);
    }
    logger_1.logger.info(`Connecting to SQLite database at: ${dbFilePath}`);
    dbInstance = new better_sqlite3_1.default(dbFilePath, {
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
function closeDatabase() {
    if (dbInstance) {
        logger_1.logger.info('Closing SQLite database connection');
        dbInstance.close();
        dbInstance = null;
    }
}
