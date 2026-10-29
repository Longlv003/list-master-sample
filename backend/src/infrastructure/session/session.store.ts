import session from 'express-session';
import { getDatabase } from '../database/db';
import { logger } from '../logger/logger';

export class SQLiteSessionStore extends session.Store {
  constructor() {
    super();
    this.cleanExpiredSessions();
    // Schedule periodic cleanup every 6 hours
    setInterval(() => {
      this.cleanExpiredSessions();
    }, 6 * 60 * 60 * 1000).unref();
  }

  get = (sid: string, callback: (err?: unknown, session?: session.SessionData | null) => void): void => {
    try {
      const db = getDatabase();
      const now = Math.floor(Date.now() / 1000);
      const row = db
        .prepare('SELECT sess, expired_at FROM sessions WHERE sid = ? AND expired_at > ?')
        .get(sid, now) as { sess: string; expired_at: number } | undefined;

      if (!row) {
        return callback(null, null);
      }

      const data = JSON.parse(row.sess) as session.SessionData;
      return callback(null, data);
    } catch (err) {
      logger.error({ err, sid }, 'Failed to get session from SQLite');
      return callback(err);
    }
  };

  set = (
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: unknown) => void
  ): void => {
    try {
      const db = getDatabase();
      // Default expiration: 1 year (or until browser close per cookie), as Q8 says pure session cookie
      let expiredAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      if (sessionData.cookie && sessionData.cookie.expires) {
        expiredAt = Math.floor(new Date(sessionData.cookie.expires).getTime() / 1000);
      } else if (sessionData.cookie && sessionData.cookie.maxAge) {
        expiredAt = Math.floor((Date.now() + sessionData.cookie.maxAge) / 1000);
      }

      const sessJson = JSON.stringify(sessionData);

      db.prepare(
        `INSERT INTO sessions (sid, sess, expired_at)
         VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET
           sess = excluded.sess,
           expired_at = excluded.expired_at`
      ).run(sid, sessJson, expiredAt);

      if (callback) callback(null);
    } catch (err) {
      logger.error({ err, sid }, 'Failed to set session in SQLite');
      if (callback) callback(err);
    }
  };

  destroy = (sid: string, callback?: (err?: unknown) => void): void => {
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      if (callback) callback(null);
    } catch (err) {
      logger.error({ err, sid }, 'Failed to destroy session in SQLite');
      if (callback) callback(err);
    }
  };

  touch = (
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: unknown) => void
  ): void => {
    this.set(sid, sessionData, callback);
  };

  private cleanExpiredSessions(): void {
    try {
      const db = getDatabase();
      const now = Math.floor(Date.now() / 1000);
      const res = db.prepare('DELETE FROM sessions WHERE expired_at <= ?').run(now);
      if (res.changes > 0) {
        logger.info(`Cleaned up ${res.changes} expired sessions from SQLite`);
      }
    } catch (err) {
      logger.error({ err }, 'Error cleaning up expired sessions');
    }
  }
}
