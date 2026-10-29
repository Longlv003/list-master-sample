"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteSessionStore = void 0;
const express_session_1 = __importDefault(require("express-session"));
const db_1 = require("../database/db");
const logger_1 = require("../logger/logger");
class SQLiteSessionStore extends express_session_1.default.Store {
    constructor() {
        super();
        this.cleanExpiredSessions();
        // Schedule periodic cleanup every 6 hours
        setInterval(() => {
            this.cleanExpiredSessions();
        }, 6 * 60 * 60 * 1000).unref();
    }
    get = (sid, callback) => {
        try {
            const db = (0, db_1.getDatabase)();
            const now = Math.floor(Date.now() / 1000);
            const row = db
                .prepare('SELECT sess, expired_at FROM sessions WHERE sid = ? AND expired_at > ?')
                .get(sid, now);
            if (!row) {
                return callback(null, null);
            }
            const data = JSON.parse(row.sess);
            return callback(null, data);
        }
        catch (err) {
            logger_1.logger.error({ err, sid }, 'Failed to get session from SQLite');
            return callback(err);
        }
    };
    set = (sid, sessionData, callback) => {
        try {
            const db = (0, db_1.getDatabase)();
            // Default expiration: 1 year (or until browser close per cookie), as Q8 says pure session cookie
            let expiredAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
            if (sessionData.cookie && sessionData.cookie.expires) {
                expiredAt = Math.floor(new Date(sessionData.cookie.expires).getTime() / 1000);
            }
            else if (sessionData.cookie && sessionData.cookie.maxAge) {
                expiredAt = Math.floor((Date.now() + sessionData.cookie.maxAge) / 1000);
            }
            const sessJson = JSON.stringify(sessionData);
            db.prepare(`INSERT INTO sessions (sid, sess, expired_at)
         VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET
           sess = excluded.sess,
           expired_at = excluded.expired_at`).run(sid, sessJson, expiredAt);
            if (callback)
                callback(null);
        }
        catch (err) {
            logger_1.logger.error({ err, sid }, 'Failed to set session in SQLite');
            if (callback)
                callback(err);
        }
    };
    destroy = (sid, callback) => {
        try {
            const db = (0, db_1.getDatabase)();
            db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
            if (callback)
                callback(null);
        }
        catch (err) {
            logger_1.logger.error({ err, sid }, 'Failed to destroy session in SQLite');
            if (callback)
                callback(err);
        }
    };
    touch = (sid, sessionData, callback) => {
        this.set(sid, sessionData, callback);
    };
    cleanExpiredSessions() {
        try {
            const db = (0, db_1.getDatabase)();
            const now = Math.floor(Date.now() / 1000);
            const res = db.prepare('DELETE FROM sessions WHERE expired_at <= ?').run(now);
            if (res.changes > 0) {
                logger_1.logger.info(`Cleaned up ${res.changes} expired sessions from SQLite`);
            }
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error cleaning up expired sessions');
        }
    }
}
exports.SQLiteSessionStore = SQLiteSessionStore;
