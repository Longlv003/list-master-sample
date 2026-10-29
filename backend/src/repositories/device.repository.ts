import { getDatabase } from '../infrastructure/database/db';
import { Device } from '../domain/entities/Device';

export class DeviceRepository {
  private db = getDatabase();

  findById(id: string): Device | null {
    const row = this.db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    return (row as Device) || null;
  }

  findByIp(ip: string): Device | null {
    const row = this.db.prepare('SELECT * FROM devices WHERE ip_address = ?').get(ip);
    return (row as Device) || null;
  }

  findAll(): Device[] {
    return this.db.prepare('SELECT * FROM devices ORDER BY name ASC').all() as Device[];
  }

  insert(device: Device): void {
    const stmt = this.db.prepare(`
      INSERT INTO devices (id, ip_address, name, description, is_active, created_at, updated_at)
      VALUES (@id, @ip_address, @name, @description, @is_active, @created_at, @updated_at)
    `);
    stmt.run(device);
  }

  update(id: string, updates: Partial<Device>): void {
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = @${key}`);
        values[key] = val;
      }
    }

    if (fields.length === 0) return;

    const sql = `UPDATE devices SET ${fields.join(', ')} WHERE id = @id`;
    this.db.prepare(sql).run(values);
  }

  toggleActive(id: string, isActive: boolean): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE devices SET is_active = ?, updated_at = ? WHERE id = ?').run(isActive ? 1 : 0, now, id);
  }

  upsertBatch(devices: Device[]): number {
    const runBatch = this.db.transaction(() => {
      let count = 0;
      const stmt = this.db.prepare(`
        INSERT INTO devices (id, ip_address, name, description, is_active, created_at, updated_at)
        VALUES (@id, @ip_address, @name, @description, @is_active, @created_at, @updated_at)
        ON CONFLICT(ip_address) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `);

      for (const d of devices) {
        stmt.run(d);
        count++;
      }
      return count;
    });

    return runBatch();
  }
}
