import fs from 'fs';
import path from 'path';
import { scanFolderRepository, ScanRecordEntity, ScanRecordFilter } from '../repositories/scanFolder.repository';
import { masterSampleRepository } from '../repositories/masterSample.repository';
import { scannerService } from './scanner.service';
import { ForbiddenError, NotFoundError } from '../domain/errors/DomainError';
import { sampleIdentity } from '../utils/sampleIdentity';

export class DashboardService {
  private enrich(records: ScanRecordEntity[]) {
    const codes = new Map<string, Set<string>>();
    for (const master of masterSampleRepository.getAll()) {
      if (!master.sampleCode) continue;
      const key = sampleIdentity(master.item, master.lot, master.barcodeId);
      if (!codes.has(key)) codes.set(key, new Set());
      codes.get(key)!.add(master.sampleCode);
    }
    return records.map(record => {
      const matches = [...(codes.get(sampleIdentity(record.item_code, record.lot_id, record.barcode_id)) || [])];
      return {...record, sample_code: matches.length === 1 ? matches[0] : undefined,
        match_warning: matches.length > 1 ? 'Nhiều Sample Code cùng Item/Lot/Barcode; cần kiểm tra master' : undefined};
    });
  }

  getDashboardData(filter: ScanRecordFilter) {
    const result = scanFolderRepository.findWithFilter(filter);
    const page = Math.max(1, filter.page || 1), limit = Math.max(1, filter.limit || 50);
    return {records: this.enrich(result.records), total: result.total, page, limit, totalPages: Math.ceil(result.total / limit)};
  }

  getExportData(filter: ScanRecordFilter) { return this.enrich(scanFolderRepository.getAllForExport(filter)); }
  triggerRefresh() { return scannerService.scan(); }

  async getFolderImages(recordId: string) {
    const record = scanFolderRepository.findById(recordId);
    if (!record) throw new NotFoundError('Không tìm thấy bản ghi folder');
    const autoImages: {name: string; url: string}[] = [], manualImages: {name: string; url: string}[] = [];
    const entries = await fs.promises.readdir(record.folder_path, {withFileTypes: true});
    const add = async (fileName: string, subDir: string, auto: boolean) => {
      const stat = await fs.promises.stat(path.join(record.folder_path, subDir, fileName));
      if (!stat.isFile()) return;
      const url = `/api/images/view?${new URLSearchParams({recordId, subDir, fileName, v: `${stat.mtimeMs}-${stat.size}`})}`;
      (auto ? autoImages : manualImages).push({name: fileName, url});
    };
    for (const entry of entries) {
      if (entry.isDirectory() && ['AUTO','MANUAL'].includes(entry.name.toUpperCase())) {
        for (const file of await fs.promises.readdir(path.join(record.folder_path, entry.name), {withFileTypes: true})) {
          if (file.isFile() && /\.(jpe?g|png)$/i.test(file.name)) await add(file.name, entry.name, entry.name.toUpperCase() === 'AUTO');
        }
      } else if (entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name)) await add(entry.name, '', /_\d{2}\.jpe?g$/i.test(entry.name));
    }
    return {autoImages, manualImages};
  }

  async getImageFilePath(recordId: string, subDir: string, fileName: string): Promise<string> {
    const record = scanFolderRepository.findById(recordId);
    if (!record) throw new NotFoundError('Không tìm thấy bản ghi');
    if (!['', 'AUTO', 'MANUAL'].includes(subDir.toUpperCase()) || path.basename(fileName) !== fileName || !/\.(jpe?g|png)$/i.test(fileName)) throw new ForbiddenError('File ảnh không hợp lệ');
    const root = await fs.promises.realpath(record.folder_path);
    const resolved = await fs.promises.realpath(path.join(root, subDir, fileName));
    const relative = path.relative(root, resolved);
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) throw new ForbiddenError('Ảnh nằm ngoài folder cho phép');
    if (!(await fs.promises.stat(resolved)).isFile()) throw new NotFoundError('Không phải file ảnh');
    return resolved;
  }
}
export const dashboardService = new DashboardService();
