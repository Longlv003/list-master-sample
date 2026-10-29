import { getDatabase } from '../infrastructure/database/db';
import path from 'path';

export interface ScanRecordEntity {
  id: string;
  run_date: string;
  year: number;
  month: number;
  day: number;
  item_code: string;
  lot_id: string;
  barcode_id: string;
  job_name: string;
  scan_machine_raw: string | null;
  scan_machine_num: number | null;
  folder_scan_num: number;
  cvr_machine_num: number;
  folder_path: string;
  log_a_path: string | null;
  log_b_path: string | null;
  auto_images_count: number;
  manual_images_count: number;
  mapping_warning: number;
  warning_message: string | null;
  metadata_warning?: string | null;
  source_status: string;
  csv_mtime: number | null;
  csv_signature?: string | null;
  last_scanned_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScanRecordFilter {
  itemCode?: string;
  lotId?: string;
  barcodeId?: string;
  scanNum?: number;
  cvrNum?: number;
  fromDate?: string;
  toDate?: string;
  hasWarning?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class ScanFolderRepository {
  private get db() {
    return getDatabase();
  }

  upsert(record: Omit<ScanRecordEntity, 'created_at' | 'updated_at' | 'last_scanned_at'>): void {
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

  touch(id: string): void {
    this.db.prepare("UPDATE scan_records SET last_scanned_at=datetime('now') WHERE id=?").run(id);
  }

  setStatus(folder: string, status: string): number {
    return this.db.prepare("UPDATE scan_records SET source_status=?, updated_at=datetime('now') WHERE folder_path=? AND source_status<>?").run(status, folder, status).changes;
  }

  reconcileRoot(root: string, seen: Set<string> | null): number {
    const records = this.db.prepare('SELECT folder_path FROM scan_records').all() as {folder_path: string}[];
    let changed = 0;
    this.db.transaction(() => {
      for (const record of records) {
        const relative = path.relative(root, record.folder_path);
        if (relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))) {
          if (!seen || !seen.has(path.resolve(record.folder_path).toLowerCase())) changed += this.setStatus(record.folder_path, seen ? 'missing' : 'offline');
        }
      }
    })();
    return changed;
  }

  findById(id: string): ScanRecordEntity | null {
    const stmt = this.db.prepare('SELECT * FROM scan_records WHERE id = ?');
    return (stmt.get(id) as ScanRecordEntity) || null;
  }

  saveCsvSignature(id: string, signature: string): void {
    this.db.prepare('UPDATE scan_records SET csv_signature = ? WHERE id = ?').run(signature, id);
  }

  findByPath(folderPath: string): ScanRecordEntity | null {
    const stmt = this.db.prepare('SELECT * FROM scan_records WHERE folder_path = ?');
    return (stmt.get(folderPath) as ScanRecordEntity) || null;
  }

  findWithFilter(filter: ScanRecordFilter): { records: ScanRecordEntity[]; total: number } {
    const conditions: string[] = [];
    const params: Record<string, any> = {};

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
    const countResult = countStmt.get(params) as { cnt: number };
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

    const records = queryStmt.all({ ...params, limit, offset }) as ScanRecordEntity[];
    return { records, total };
  }

  getAllForExport(filter: ScanRecordFilter): ScanRecordEntity[] {
    const {total} = this.findWithFilter({...filter, page: 1, limit: 1});
    return this.findWithFilter({...filter, page: 1, limit: Math.max(1, total)}).records;
  }
}

export const scanFolderRepository = new ScanFolderRepository();
