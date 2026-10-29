import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config/config';
import { getDatabase } from '../infrastructure/database/db';
import { logger } from '../infrastructure/logger/logger';
import { auditService } from './audit.service';

export class MaintenanceService {
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  status = {lastBackupAt: null as string | null, lastError: null as string | null};
  start(): void {
    if (this.timer) return;
    void this.run();
    this.timer = setInterval(() => { void this.run(); }, 60000); this.timer.unref();
  }
  run(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.perform().then(() => { this.status.lastError = null; }).catch(err => {
      this.status.lastError = String(err); logger.error({err}, 'Backup/maintenance failed');
    }).finally(() => { this.running = null; });
    return this.running;
  }
  private async unlinkInside(directory: string, name: string): Promise<void> {
    const root = await fs.promises.realpath(directory);
    const target = path.resolve(root, name);
    if (path.dirname(target) !== root || path.basename(name) !== name) throw new Error('Invalid retention target');
    const stat = await fs.promises.lstat(target);
    if (stat.isFile() && !stat.isSymbolicLink()) await fs.promises.unlink(target);
  }
  private async perform(): Promise<void> {
    await auditService.flush().catch(err => logger.warn({err}, 'Audit remains in outbox; continuing database backup'));
    const directory = path.join(path.dirname(config.resolvedPaths.database), 'backups');
    await fs.promises.mkdir(directory, {recursive: true});
    const files = (await fs.promises.readdir(directory)).filter(name => /^app-backup-\d+\.db$/.test(name)).sort();
    const last = files.length ? Number(files[files.length - 1].match(/\d+/)![0]) : 0;
    if (last) this.status.lastBackupAt = new Date(last).toISOString();
    if (Date.now() - last >= config.backupIntervalHours * 3600000) {
      const stamp = Date.now(); const filename = `app-backup-${stamp}.db`;
      const temporary = path.join(directory, filename + '.tmp');
      await getDatabase().backup(temporary);
      const check = new Database(temporary, {readonly: true});
      try { if (check.pragma('integrity_check', {simple: true}) !== 'ok') throw new Error('Backup integrity check failed'); }
      finally { check.close(); }
      await fs.promises.rename(temporary, path.join(directory, filename));
      this.status.lastBackupAt = new Date(stamp).toISOString();
    }
    for (const name of files) {
      const stamp = Number(name.match(/\d+/)![0]);
      // Always keep at least the newest verified backup.
      if (stamp !== last && Date.now() - stamp > config.backupRetentionDays * 86400000) await this.unlinkInside(directory, name);
    }
    const cutoff = Date.now() - config.logRetentionDays * 86400000;
    for (const name of await fs.promises.readdir(config.resolvedPaths.auditLog)) {
      const match = name.match(/^audit-(\d{4})-(\d{2})\.jsonl$/);
      // Monthly file is removed only after its entire month is outside retention.
      if (match && Date.UTC(Number(match[1]), Number(match[2]), 1) < cutoff) await this.unlinkInside(config.resolvedPaths.auditLog, name);
    }
    getDatabase().prepare('DELETE FROM scan_directory_cache WHERE folder_path NOT IN (SELECT folder_path FROM scan_records) AND rowid NOT IN (SELECT rowid FROM scan_directory_cache ORDER BY rowid DESC LIMIT 50000)').run();
  }
  async stop(): Promise<void> { if (this.timer) clearInterval(this.timer); this.timer = null; await this.running; }
}
export const maintenanceService = new MaintenanceService();
