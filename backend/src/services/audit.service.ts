import fs from 'fs';
import path from 'path';
import readline from 'readline';
import crypto from 'crypto';
import { AuditEntry } from '../domain/entities/AuditLog';
import { config } from '../config/config';
import { logger } from '../infrastructure/logger/logger';
import { getDatabase } from '../infrastructure/database/db';
import { AuditQueryDto } from '../dtos/audit.dto';

class AuditService {
  lastError: string | null = null;
  private running: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;
  log(entry: Omit<AuditEntry, 'ts'>): void {
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret/i.test(key)).map(([key, val]) => [key, redact(val)]));
      return value;
    };
    const id = crypto.randomUUID();
    const record = redact({ ...entry, id, ts: new Date().toISOString() });
    getDatabase().prepare('INSERT INTO audit_outbox (id, entry_json) VALUES (?, ?)').run(id, JSON.stringify(record));
    void this.flush().catch(err => {
      logger.error({err}, 'Audit remains queued in SQLite');
      if (!this.timer) { this.timer = setInterval(() => { void this.flush().catch(error => logger.error({error}, 'Audit retry failed')); }, 30000); this.timer.unref(); }
    });
  }

  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.performFlush().then(() => { this.lastError = null; }).catch(err => {
      this.lastError = String(err); throw err;
    }).finally(() => { this.running = null; });
    return this.running;
  }

  private async performFlush(): Promise<void> {
    const db = getDatabase();
    await fs.promises.mkdir(config.resolvedPaths.auditLog, {recursive: true});
    for (;;) {
      const batch = db.prepare('SELECT id, entry_json FROM audit_outbox ORDER BY created_at, rowid LIMIT 100').all() as {id: string; entry_json: string}[];
      if (!batch.length) return;
      for (const row of batch) {
        const entry = JSON.parse(row.entry_json) as AuditEntry;
        const file = path.join(config.resolvedPaths.auditLog, `audit-${entry.ts.slice(0, 7)}.jsonl`);
        const fd = await fs.promises.open(file, 'a');
        try { await fd.writeFile(row.entry_json + '\n'); await fd.sync(); } finally { await fd.close(); }
        db.prepare('DELETE FROM audit_outbox WHERE id=?').run(row.id);
      }
    }
  }

  async *entries(query: AuditQueryDto = {}): AsyncGenerator<AuditEntry> {
    await this.flush();
    const files = (await fs.promises.readdir(config.resolvedPaths.auditLog)).filter(file => /^audit-\d{4}-\d{2}\.jsonl$/.test(file)).sort();
    const seen = new Set<string>();
    for (const file of files) {
      const stream = fs.createReadStream(path.join(config.resolvedPaths.auditLog, file));
      const lines = readline.createInterface({input: stream, crlfDelay: Infinity});
      try {
        for await (const line of lines) {
          let entry: AuditEntry & {id?: string};
          try { entry = JSON.parse(line); } catch { continue; }
          if (!entry.ts || !entry.action) continue;
          if (entry.id) { if (seen.has(entry.id)) continue; seen.add(entry.id); }
          if (query.action && !entry.action.toLowerCase().includes(query.action.toLowerCase())) continue;
          if (query.actor_id && query.actor_id !== entry.actor_id) continue;
          if (query.entity_type && query.entity_type !== entry.entity_type) continue;
          if (query.entity_id && query.entity_id !== entry.entity_id) continue;
          if (query.startDate && entry.ts < query.startDate) continue;
          if (query.endDate && entry.ts >= query.endDate) continue;
          yield entry;
        }
      } finally { lines.close(); stream.destroy(); }
    }
  }

  async query(query: AuditQueryDto = {}) {
    const page = Math.max(1, Number(query.page) || 1), limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
    const keep = page * limit;
    const recent: AuditEntry[] = [];
    let total = 0;
    for await (const entry of this.entries(query)) {
      total++; recent.push(entry);
      if (recent.length > keep) recent.shift();
    }
    recent.reverse();
    return {items: recent.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1};
  }

  async stop(): Promise<void> { if (this.timer) clearTimeout(this.timer); this.timer = null; await this.flush(); }
}
export const auditService = new AuditService();
