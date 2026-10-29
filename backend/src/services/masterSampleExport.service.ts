import { config } from '../config/config';
import { logger } from '../infrastructure/logger/logger';
import { masterSampleRepository } from '../repositories/masterSample.repository';
import { writeJsonAtomic } from '../utils/atomicFile';

/** One-way export: SQLite -> local JSON and UNC JSON for other tools. */
export class MasterSampleExportService {
  private timer: NodeJS.Timeout | null = null;
  private wakeTimer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private active = false;
  private requestedAgain = false;
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.active) return;
    masterSampleRepository.initialize();
    this.active = true;
    this.unsubscribe = masterSampleRepository.onChange(() => this.requestExport());
    this.requestExport();
    // Repair stale/deleted external JSON and retry failed writes without scanning folders.
    this.timer = setInterval(() => this.requestExport(), 60_000);
    this.timer.unref();
  }

  requestExport(): void {
    if (!this.active) return;
    if (this.running) { this.requestedAgain = true; return; }
    if (this.wakeTimer) return;
    this.wakeTimer = setTimeout(() => {
      this.wakeTimer = null;
      void this.exportNow().catch(err => {
        logger.warn({ err }, 'Master samples saved in SQLite; JSON export failed and will retry');
      });
    }, 50);
  }

  exportNow(): Promise<void> {
    if (this.running) { this.requestedAgain = true; return this.running; }
    this.running = this.performExport().finally(() => {
      this.running = null;
      if (this.requestedAgain) {
        this.requestedAgain = false;
        this.requestExport();
      }
    });
    return this.running;
  }

  private async performExport(): Promise<void> {
    const snapshot = masterSampleRepository.exportSnapshot();
    try {
      const targets = new Set([config.resolvedPaths.localMasterSampleJson, config.resolvedPaths.masterSampleJson]);
      for (const target of targets) await writeJsonAtomic(target, snapshot.items);
      masterSampleRepository.recordExport(snapshot.revision, null);
    } catch (err) {
      masterSampleRepository.recordExport(snapshot.revision, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    if (this.wakeTimer) clearTimeout(this.wakeTimer);
    this.timer = null;
    this.wakeTimer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    await this.running;
  }
}

export const masterSampleExporter = new MasterSampleExportService();
