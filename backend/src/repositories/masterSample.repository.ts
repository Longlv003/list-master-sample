import { config } from '../config/config';
import { getDatabase } from '../infrastructure/database/db';
import { normalizeIdentifier, sampleIdentity } from '../utils/sampleIdentity';
import { ConflictError } from '../domain/errors/DomainError';

export interface MasterSampleItem {
  id: string;
  sampleCode?: string;
  item: string;
  lot: string;
  barcodeId: string;
  manufactureDate: string;
  expiryDate: string;
  quantity?: number;
  layer?: string;
  programName?: string;
  comment?: string;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface MasterSampleFilter {
  search?: string;
  item?: string;
  lot?: string;
  barcodeId?: string;
  status?: 'all' | 'valid' | 'expiring' | 'expired' | 'unknown';
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'manufactureDate' | 'expiryDate' | 'item' | 'lot';
  sortOrder?: 'ASC' | 'DESC';
}

export class MasterSampleRepository {
  private listeners = new Set<() => void>();
  private get db() { return getDatabase(); }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private normalize(item: MasterSampleItem): MasterSampleItem {
    return { ...item, sampleCode: item.sampleCode?.trim(), item: item.item.trim(),
      lot: normalizeIdentifier(item.lot, 5), barcodeId: normalizeIdentifier(item.barcodeId, 3) };
  }

  private readRows(): MasterSampleItem[] {
    const rows = this.db.prepare('SELECT data_json FROM master_samples ORDER BY sort_order, id').all() as { data_json: string }[];
    return rows.map(row => JSON.parse(row.data_json) as MasterSampleItem);
  }

  private writeRows(items: MasterSampleItem[]): void {
    this.db.prepare('DELETE FROM master_samples').run();
    const insert = this.db.prepare('INSERT INTO master_samples (id, sort_order, data_json) VALUES (?, ?, ?)');
    items.forEach((item, index) => insert.run(item.id, index, JSON.stringify(this.normalize(item))));
    this.db.prepare('UPDATE master_sample_export_state SET revision=revision+1 WHERE singleton=1').run();
  }

  initialize(): void {
    this.db.transaction(() => {
      const state = this.db.prepare('SELECT initialized FROM master_sample_export_state WHERE singleton=1').get() as { initialized: number };
      if (state.initialized) return;
      // One-time migration from the previous SQLite cache. Never import a JSON file.
      const cached = this.db.prepare('SELECT data_json FROM master_sample_cache WHERE source_path=?')
        .get(config.resolvedPaths.masterSampleJson) as { data_json: string } | undefined;
      const fallback = cached || this.db.prepare('SELECT data_json FROM master_sample_cache ORDER BY updated_at DESC, source_path LIMIT 1')
        .get() as { data_json: string } | undefined;
      const items: MasterSampleItem[] = fallback ? JSON.parse(fallback.data_json) : [];
      if (!Array.isArray(items)) throw new Error('Invalid master sample data in SQLite');
      if (!this.db.prepare('SELECT id FROM master_samples LIMIT 1').get()) this.writeRows(items);
      this.db.prepare('UPDATE master_sample_export_state SET initialized=1 WHERE singleton=1').run();
    })();
  }

  getAll(includeDeleted = false): MasterSampleItem[] {
    this.initialize();
    const items = this.readRows();
    return includeDeleted ? items : items.filter(item => !item.deletedAt);
  }

  getDeletedOnly(): MasterSampleItem[] { return this.getAll(true).filter(item => !!item.deletedAt); }

  findById(id: string, includeDeleted = true): MasterSampleItem | null {
    return this.getAll(includeDeleted).find(item => item.id === id) || null;
  }

  private mutate<T>(change: (items: MasterSampleItem[]) => T): T {
    this.initialize();
    const result = this.db.transaction(() => {
      const items = this.readRows();
      const result = change(items);
      this.writeRows(items);
      return result;
    })();
    this.listeners.forEach(listener => listener());
    return result;
  }

  async saveAll(items: MasterSampleItem[]): Promise<void> {
    this.mutate(current => { current.splice(0, current.length, ...items); });
  }

  async insert(item: MasterSampleItem): Promise<MasterSampleItem> {
    return this.mutate(all => {
      const normalized = this.normalize(item);
      this.assertUnique(all, normalized);
      all.push(normalized); return normalized;
    });
  }

  async update(id: string, data: Partial<MasterSampleItem>): Promise<MasterSampleItem | null> {
    return this.mutate(all => {
      const index = all.findIndex(item => item.id === id);
      if (index === -1) return null;
      const updated = this.normalize({ ...all[index], ...data, id, updatedAt: new Date().toISOString() });
      this.assertUnique(all, updated);
      all[index] = updated;
      return all[index];
    });
  }

  async softDelete(ids: string[], deletedBy: string): Promise<number> {
    return this.mutate(all => {
      let count = 0;
      const now = new Date().toISOString();
      for (const item of all) {
        if (ids.includes(item.id) && !item.deletedAt) {
          item.deletedAt = now; item.deletedBy = deletedBy; item.updatedAt = now; count++;
        }
      }
      return count;
    });
  }

  private assertUnique(all: MasterSampleItem[], candidate: MasterSampleItem): void {
    if (candidate.deletedAt) return;
    const key = sampleIdentity(candidate.item, candidate.lot, candidate.barcodeId);
    if (all.some(item => item.id !== candidate.id && !item.deletedAt && sampleIdentity(item.item, item.lot, item.barcodeId) === key)) {
      throw new ConflictError('Đã có Master Sample cùng Item, Lot và Barcode');
    }
  }

  async restore(ids: string[], username = 'system'): Promise<number> {
    return this.mutate(all => {
      let count = 0;
      for (const item of all) {
        if (ids.includes(item.id) && item.deletedAt) {
          this.assertUnique(all, { ...item, deletedAt: null });
          item.deletedAt = null; item.deletedBy = null; item.updatedAt = new Date().toISOString(); item.updatedBy = username; count++;
        }
      }
      return count;
    });
  }

  exportSnapshot(): { revision: number; items: MasterSampleItem[] } {
    this.initialize();
    return this.db.transaction(() => {
      const { revision } = this.db.prepare('SELECT revision FROM master_sample_export_state WHERE singleton=1').get() as { revision: number };
      return { revision, items: this.readRows() };
    })();
  }

  recordExport(revision: number, error: string | null): void {
    if (error) this.db.prepare('UPDATE master_sample_export_state SET last_error=? WHERE singleton=1').run(error);
    else this.db.prepare("UPDATE master_sample_export_state SET exported_revision=?, last_error=NULL, last_export_at=datetime('now') WHERE singleton=1").run(revision);
  }
}

export const masterSampleRepository = new MasterSampleRepository();
