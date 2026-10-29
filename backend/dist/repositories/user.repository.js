"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const db_1 = require("../infrastructure/database/db");
class UserRepository {
    db = (0, db_1.getDatabase)();
    findById(id) {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return row || null;
    }
    findByUsername(username) {
        const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        return row || null;
    }
    findAll() {
        return this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    }
    count() {
        const row = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
        return row ? row.count : 0;
    }
    insert(user) {
        const stmt = this.db.prepare(`
      INSERT INTO users (
        id, username, password_hash, display_name, is_active,
        perm_add, perm_update, perm_delete, perm_restore,
        perm_manage_users, perm_view_audit_logs,
        created_at, updated_at
      ) VALUES (
        @id, @username, @password_hash, @display_name, @is_active,
        @perm_add, @perm_update, @perm_delete, @perm_restore,
        @perm_manage_users, @perm_view_audit_logs,
        @created_at, @updated_at
      )
    `);
        stmt.run(user);
    }
    update(id, updates) {
        const fields = [];
        const values = { id };
        for (const [key, val] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = @${key}`);
                values[key] = val;
            }
        }
        if (fields.length === 0)
            return;
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = @id`;
        this.db.prepare(sql).run(values);
    }
    updateLastLogin(id) {
        const now = new Date().toISOString();
        this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, id);
    }
    toggleActive(id, isActive) {
        const now = new Date().toISOString();
        this.db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(isActive ? 1 : 0, now, id);
    }
}
exports.UserRepository = UserRepository;
