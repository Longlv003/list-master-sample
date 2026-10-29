import { getDatabase } from '../infrastructure/database/db';
import { User } from '../domain/entities/User';

export class UserRepository {
  private db = getDatabase();

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return (row as User) || null;
  }

  findByUsername(username: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    return (row as User) || null;
  }

  findAll(): User[] {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[];
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return row ? row.count : 0;
  }

  insert(user: User): void {
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

  update(id: string, updates: Partial<User>): void {
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = @${key}`);
        values[key] = val;
      }
    }

    if (fields.length === 0) return;

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = @id`;
    this.db.prepare(sql).run(values);
  }

  updateLastLogin(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, id);
  }

  toggleActive(id: string, isActive: boolean): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(isActive ? 1 : 0, now, id);
  }
}
