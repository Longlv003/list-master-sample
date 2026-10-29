"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterSampleRepository = exports.MasterSampleRepository = void 0;
const config_1 = require("../config/config");
const db_1 = require("../infrastructure/database/db");
const sampleIdentity_1 = require("../utils/sampleIdentity");
const DomainError_1 = require("../domain/errors/DomainError");
class MasterSampleRepository {
    listeners = new Set();
    get db() { return (0, db_1.getDatabase)(); }
    onChange(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    normalize(item) {
        return { ...item, sampleCode: item.sampleCode?.trim(), item: item.item.trim(),
            lot: (0, sampleIdentity_1.normalizeIdentifier)(item.lot, 5), barcodeId: (0, sampleIdentity_1.normalizeIdentifier)(item.barcodeId, 3) };
    }
    readRows() {
        const rows = this.db.prepare('SELECT data_json FROM master_samples ORDER BY sort_order, id').all();
        return rows.map(row => JSON.parse(row.data_json));
    }
    writeRows(items) {
        this.db.prepare('DELETE FROM master_samples').run();
        const insert = this.db.prepare('INSERT INTO master_samples (id, sort_order, data_json) VALUES (?, ?, ?)');
        items.forEach((item, index) => insert.run(item.id, index, JSON.stringify(this.normalize(item))));
        this.db.prepare('UPDATE master_sample_export_state SET revision=revision+1 WHERE singleton=1').run();
    }
    initialize() {
        this.db.transaction(() => {
            const state = this.db.prepare('SELECT initialized FROM master_sample_export_state WHERE singleton=1').get();
            if (state.initialized)
                return;
            // One-time migration from the previous SQLite cache. Never import a JSON file.
            const cached = this.db.prepare('SELECT data_json FROM master_sample_cache WHERE source_path=?')
                .get(config_1.config.resolvedPaths.masterSampleJson);
            const fallback = cached || this.db.prepare('SELECT data_json FROM master_sample_cache ORDER BY updated_at DESC, source_path LIMIT 1')
                .get();
            const items = fallback ? JSON.parse(fallback.data_json) : [];
            if (!Array.isArray(items))
                throw new Error('Invalid master sample data in SQLite');
            if (!this.db.prepare('SELECT id FROM master_samples LIMIT 1').get())
                this.writeRows(items);
            this.db.prepare('UPDATE master_sample_export_state SET initialized=1 WHERE singleton=1').run();
        })();
    }
    getAll(includeDeleted = false) {
        this.initialize();
        const items = this.readRows();
        return includeDeleted ? items : items.filter(item => !item.deletedAt);
    }
    getDeletedOnly() { return this.getAll(true).filter(item => !!item.deletedAt); }
    findById(id, includeDeleted = true) {
        return this.getAll(includeDeleted).find(item => item.id === id) || null;
    }
    mutate(change) {
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
    async saveAll(items) {
        this.mutate(current => { current.splice(0, current.length, ...items); });
    }
    async insert(item) {
        return this.mutate(all => {
            const normalized = this.normalize(item);
            this.assertUnique(all, normalized);
            all.push(normalized);
            return normalized;
        });
    }
    async update(id, data) {
        return this.mutate(all => {
            const index = all.findIndex(item => item.id === id);
            if (index === -1)
                return null;
            const updated = this.normalize({ ...all[index], ...data, id, updatedAt: new Date().toISOString() });
            this.assertUnique(all, updated);
            all[index] = updated;
            return all[index];
        });
    }
    async softDelete(ids, deletedBy) {
        return this.mutate(all => {
            let count = 0;
            const now = new Date().toISOString();
            for (const item of all) {
                if (ids.includes(item.id) && !item.deletedAt) {
                    item.deletedAt = now;
                    item.deletedBy = deletedBy;
                    item.updatedAt = now;
                    count++;
                }
            }
            return count;
        });
    }
    assertUnique(all, candidate) {
        if (candidate.deletedAt)
            return;
        const key = (0, sampleIdentity_1.sampleIdentity)(candidate.item, candidate.lot, candidate.barcodeId);
        if (all.some(item => item.id !== candidate.id && !item.deletedAt && (0, sampleIdentity_1.sampleIdentity)(item.item, item.lot, item.barcodeId) === key)) {
            throw new DomainError_1.ConflictError('Đã có Master Sample cùng Item, Lot và Barcode');
        }
    }
    async restore(ids, username = 'system') {
        return this.mutate(all => {
            let count = 0;
            for (const item of all) {
                if (ids.includes(item.id) && item.deletedAt) {
                    this.assertUnique(all, { ...item, deletedAt: null });
                    item.deletedAt = null;
                    item.deletedBy = null;
                    item.updatedAt = new Date().toISOString();
                    item.updatedBy = username;
                    count++;
                }
            }
            return count;
        });
    }
    exportSnapshot() {
        this.initialize();
        return this.db.transaction(() => {
            const { revision } = this.db.prepare('SELECT revision FROM master_sample_export_state WHERE singleton=1').get();
            return { revision, items: this.readRows() };
        })();
    }
    recordExport(revision, error) {
        if (error)
            this.db.prepare('UPDATE master_sample_export_state SET last_error=? WHERE singleton=1').run(error);
        else
            this.db.prepare("UPDATE master_sample_export_state SET exported_revision=?, last_error=NULL, last_export_at=datetime('now') WHERE singleton=1").run(revision);
    }
}
exports.MasterSampleRepository = MasterSampleRepository;
exports.masterSampleRepository = new MasterSampleRepository();
