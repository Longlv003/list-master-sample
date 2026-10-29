"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleRepository = void 0;
const db_1 = require("../infrastructure/database/db");
const DomainError_1 = require("../domain/errors/DomainError");
const config_1 = require("../config/config");
function localDay(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
class SampleRepository {
    db = (0, db_1.getDatabase)();
    findById(id) {
        const row = this.db.prepare('SELECT * FROM samples WHERE id = ?').get(id);
        return row || null;
    }
    findByExcelRowId(excelRowId) {
        const row = this.db.prepare('SELECT * FROM samples WHERE excel_row_id = ?').get(excelRowId);
        return row || null;
    }
    findActiveBySampleCode(sampleCode) {
        const row = this.db.prepare('SELECT * FROM samples WHERE sample_code = ? AND deleted_at IS NULL ORDER BY created_at ASC').get(sampleCode);
        return row || null;
    }
    findActiveByNo(no) {
        const row = this.db.prepare('SELECT * FROM samples WHERE no = ? AND deleted_at IS NULL ORDER BY created_at ASC').get(no);
        return row || null;
    }
    findMany(query = {}, includeDeleted = false) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
        const offset = (page - 1) * limit;
        const whereClauses = [];
        const params = [];
        if (!includeDeleted) {
            whereClauses.push('deleted_at IS NULL');
        }
        // Search query
        if (query.search && query.search.trim()) {
            const searchTerm = `%${query.search.trim()}%`;
            const searchFields = query.searchFields && query.searchFields.length > 0
                ? query.searchFields
                : ['sample_code', 'item_code', 'layer', 'program_name', 'comment'];
            const allowed = ['sample_code', 'item_code', 'layer', 'program_name', 'comment'];
            if (searchFields.some(field => !allowed.includes(field)))
                throw new DomainError_1.ValidationError('Trường tìm kiếm không hợp lệ');
            const fieldClauses = searchFields.map((field) => `${field} LIKE ?`);
            whereClauses.push(`(${fieldClauses.join(' OR ')})`);
            for (let i = 0; i < searchFields.length; i++) {
                params.push(searchTerm);
            }
        }
        // Expiry status filter
        if (query.expiryStatus && !includeDeleted) {
            const today = localDay(new Date());
            if (query.expiryStatus === 'expired') {
                whereClauses.push('expiry_date IS NOT NULL AND expiry_date < ?');
                params.push(today);
            }
            else if (query.expiryStatus === 'expiring') {
                // Will check in range [today, today + 7 days] (or handled by service/SQL)
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + config_1.config.expiryWarningDays);
                const warningDate = localDay(targetDate);
                whereClauses.push('expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ?');
                params.push(today, warningDate);
            }
            else if (query.expiryStatus === 'valid') {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + config_1.config.expiryWarningDays);
                const warningDate = targetDate.toISOString().split('T')[0];
                whereClauses.push('expiry_date IS NOT NULL AND expiry_date > ?');
                params.push(warningDate);
            }
        }
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        // Count total
        const countRow = this.db.prepare(`SELECT COUNT(*) as count FROM samples ${whereSql}`).get(...params);
        const total = countRow ? countRow.count : 0;
        // Sorting
        const allowedSortFields = ['no', 'sample_code', 'quantity', 'made_date', 'expiry_date', 'created_at', 'updated_at'];
        const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'no';
        const sortOrder = query.sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const items = this.db
            .prepare(`SELECT * FROM samples ${whereSql} ORDER BY ${sortBy} ${sortOrder} NULLS LAST LIMIT ? OFFSET ?`)
            .all(...params, limit, offset);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }
    findDeleted() {
        return this.db
            .prepare('SELECT * FROM samples WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC')
            .all();
    }
    findAllActive() {
        return this.db
            .prepare('SELECT * FROM samples WHERE deleted_at IS NULL ORDER BY no ASC NULLS LAST, created_at ASC')
            .all();
    }
    insert(sample) {
        const stmt = this.db.prepare(`
      INSERT INTO samples (
        id, no, sample_code, quantity, item_code, layer,
        program_name, made_date, expiry_date, comment, excel_row_id,
        created_at, created_by, updated_at, updated_by
      ) VALUES (
        @id, @no, @sample_code, @quantity, @item_code, @layer,
        @program_name, @made_date, @expiry_date, @comment, @excel_row_id,
        @created_at, @created_by, @updated_at, @updated_by
      )
    `);
        stmt.run(sample);
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
        const sql = `UPDATE samples SET ${fields.join(', ')} WHERE id = @id`;
        this.db.prepare(sql).run(values);
    }
    softDelete(id, userId) {
        const now = new Date().toISOString();
        const res = this.db
            .prepare('UPDATE samples SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
            .run(now, userId || null, now, id);
        return res.changes > 0;
    }
    softDeleteBatch(ids, userId) {
        const now = new Date().toISOString();
        const runBatch = this.db.transaction(() => {
            let count = 0;
            const stmt = this.db.prepare('UPDATE samples SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL');
            for (const id of ids) {
                const res = stmt.run(now, userId || null, now, id);
                if (res.changes > 0)
                    count++;
            }
            return count;
        });
        return runBatch();
    }
    restore(id, userId) {
        const now = new Date().toISOString();
        const res = this.db
            .prepare('UPDATE samples SET deleted_at = NULL, deleted_by = NULL, updated_at = ?, updated_by = ? WHERE id = ? AND deleted_at IS NOT NULL')
            .run(now, userId || null, id);
        return res.changes > 0;
    }
    getMaxNo() {
        const row = this.db.prepare('SELECT MAX(no) as max_no FROM samples WHERE deleted_at IS NULL').get();
        return row && row.max_no !== null ? row.max_no : 0;
    }
}
exports.SampleRepository = SampleRepository;
