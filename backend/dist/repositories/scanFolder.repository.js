"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanFolderRepository = exports.ScanFolderRepository = void 0;
const db_1 = require("../infrastructure/database/db");
const path_1 = __importDefault(require("path"));
class ScanFolderRepository {
    get db() {
        return (0, db_1.getDatabase)();
    }
    upsert(record) {
        const stmt = this.db.prepare(`
      INSERT INTO scan_records (
        id, run_date, year, month, day, item_code, lot_id, barcode_id, job_name,
        scan_machine_raw, scan_machine_num, folder_scan_num, cvr_machine_num,
        folder_path, log_a_path, log_b_path, auto_images_count, manual_images_count,
        mapping_warning, warning_message, metadata_warning, source_status, csv_mtime, csv_signature, last_scanned_at,
        created_at, updated_at
      ) VALUES (
        @id, @run_date, @year, @month, @day, @item_code, @lot_id, @barcode_id, @job_name,
        @scan_machine_raw, @scan_machine_num, @folder_scan_num, @cvr_machine_num,
        @folder_path, @log_a_path, @log_b_path, @auto_images_count, @manual_images_count,
        @mapping_warning, @warning_message, @metadata_warning, @source_status, @csv_mtime, @csv_signature, datetime('now'),
        datetime('now'), datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        run_date = excluded.run_date,
        year = excluded.year,
        month = excluded.month,
        day = excluded.day,
        item_code = excluded.item_code,
        lot_id = excluded.lot_id,
        barcode_id = excluded.barcode_id,
        job_name = excluded.job_name,
        scan_machine_raw = excluded.scan_machine_raw,
        scan_machine_num = excluded.scan_machine_num,
        folder_scan_num = excluded.folder_scan_num,
        cvr_machine_num = excluded.cvr_machine_num,
        log_a_path = excluded.log_a_path,
        log_b_path = excluded.log_b_path,
        auto_images_count = excluded.auto_images_count,
        manual_images_count = excluded.manual_images_count,
        mapping_warning = excluded.mapping_warning,
        warning_message = excluded.warning_message,
        metadata_warning = excluded.metadata_warning,
        source_status = excluded.source_status,
        csv_mtime = excluded.csv_mtime,
        csv_signature = excluded.csv_signature,
        last_scanned_at = datetime('now'),
        updated_at = datetime('now')
    `);
        stmt.run({ ...record, metadata_warning: record.metadata_warning ?? null, csv_signature: record.csv_signature ?? null });
    }
    touch(id) {
        this.db.prepare("UPDATE scan_records SET last_scanned_at=datetime('now') WHERE id=?").run(id);
    }
    setStatus(folder, status) {
        return this.db.prepare("UPDATE scan_records SET source_status=?, updated_at=datetime('now') WHERE folder_path=? AND source_status<>?").run(status, folder, status).changes;
    }
    reconcileRoot(root, seen) {
        const records = this.db.prepare('SELECT folder_path FROM scan_records').all();
        let changed = 0;
        this.db.transaction(() => {
            for (const record of records) {
                const relative = path_1.default.relative(root, record.folder_path);
                if (relative === '' || (!path_1.default.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path_1.default.sep))) {
                    if (!seen || !seen.has(path_1.default.resolve(record.folder_path).toLowerCase()))
                        changed += this.setStatus(record.folder_path, seen ? 'missing' : 'offline');
                }
            }
        })();
        return changed;
    }
    findById(id) {
        const stmt = this.db.prepare('SELECT * FROM scan_records WHERE id = ?');
        return stmt.get(id) || null;
    }
    saveCsvSignature(id, signature) {
        this.db.prepare('UPDATE scan_records SET csv_signature = ? WHERE id = ?').run(signature, id);
    }
    findByPath(folderPath) {
        const stmt = this.db.prepare('SELECT * FROM scan_records WHERE folder_path = ?');
        return stmt.get(folderPath) || null;
    }
    findWithFilter(filter) {
        const conditions = [];
        const params = {};
        if (filter.itemCode) {
            conditions.push('item_code LIKE @itemCode');
            params.itemCode = `%${filter.itemCode}%`;
        }
        if (filter.lotId) {
            conditions.push('lot_id LIKE @lotId');
            params.lotId = `%${filter.lotId}%`;
        }
        if (filter.barcodeId) {
            conditions.push('barcode_id LIKE @barcodeId');
            params.barcodeId = `%${filter.barcodeId}%`;
        }
        if (filter.scanNum !== undefined) {
            conditions.push('folder_scan_num = @scanNum');
            params.scanNum = filter.scanNum;
        }
        if (filter.cvrNum !== undefined) {
            conditions.push('cvr_machine_num = @cvrNum');
            params.cvrNum = filter.cvrNum;
        }
        if (filter.fromDate) {
            conditions.push('run_date >= @fromDate');
            params.fromDate = filter.fromDate;
        }
        if (filter.toDate) {
            conditions.push('run_date <= @toDate');
            params.toDate = filter.toDate;
        }
        if (filter.hasWarning) {
            conditions.push('mapping_warning = 1');
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Count
        const countStmt = this.db.prepare(`SELECT COUNT(*) as cnt FROM scan_records ${whereClause}`);
        const countResult = countStmt.get(params);
        const total = countResult.cnt;
        // Paging & Sort
        const page = Math.max(1, filter.page || 1);
        const limit = Math.max(1, filter.limit || 50);
        const offset = (page - 1) * limit;
        const allowedSortFields = ['run_date', 'item_code', 'folder_scan_num', 'cvr_machine_num', 'barcode_id', 'created_at'];
        const sortBy = allowedSortFields.includes(filter.sortBy || '') ? filter.sortBy : 'run_date';
        const sortOrder = filter.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        const queryStmt = this.db.prepare(`
      SELECT * FROM scan_records
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}, id DESC
      LIMIT @limit OFFSET @offset
    `);
        const records = queryStmt.all({ ...params, limit, offset });
        return { records, total };
    }
    getAllForExport(filter) {
        const { total } = this.findWithFilter({ ...filter, page: 1, limit: 1 });
        return this.findWithFilter({ ...filter, page: 1, limit: Math.max(1, total) }).records;
    }
}
exports.ScanFolderRepository = ScanFolderRepository;
exports.scanFolderRepository = new ScanFolderRepository();
