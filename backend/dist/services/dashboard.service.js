"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const scanFolder_repository_1 = require("../repositories/scanFolder.repository");
const masterSample_repository_1 = require("../repositories/masterSample.repository");
const scanner_service_1 = require("./scanner.service");
const DomainError_1 = require("../domain/errors/DomainError");
const sampleIdentity_1 = require("../utils/sampleIdentity");
class DashboardService {
    enrich(records) {
        const codes = new Map();
        for (const master of masterSample_repository_1.masterSampleRepository.getAll()) {
            if (!master.sampleCode)
                continue;
            const key = (0, sampleIdentity_1.sampleIdentity)(master.item, master.lot, master.barcodeId);
            if (!codes.has(key))
                codes.set(key, new Set());
            codes.get(key).add(master.sampleCode);
        }
        return records.map(record => {
            const matches = [...(codes.get((0, sampleIdentity_1.sampleIdentity)(record.item_code, record.lot_id, record.barcode_id)) || [])];
            return { ...record, sample_code: matches.length === 1 ? matches[0] : undefined,
                match_warning: matches.length > 1 ? 'Nhiều Sample Code cùng Item/Lot/Barcode; cần kiểm tra master' : undefined };
        });
    }
    getDashboardData(filter) {
        const result = scanFolder_repository_1.scanFolderRepository.findWithFilter(filter);
        const page = Math.max(1, filter.page || 1), limit = Math.max(1, filter.limit || 50);
        return { records: this.enrich(result.records), total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) };
    }
    getExportData(filter) { return this.enrich(scanFolder_repository_1.scanFolderRepository.getAllForExport(filter)); }
    triggerRefresh() { return scanner_service_1.scannerService.scan(); }
    async getFolderImages(recordId) {
        const record = scanFolder_repository_1.scanFolderRepository.findById(recordId);
        if (!record)
            throw new DomainError_1.NotFoundError('Không tìm thấy bản ghi folder');
        const autoImages = [], manualImages = [];
        const entries = await fs_1.default.promises.readdir(record.folder_path, { withFileTypes: true });
        const add = async (fileName, subDir, auto) => {
            const stat = await fs_1.default.promises.stat(path_1.default.join(record.folder_path, subDir, fileName));
            if (!stat.isFile())
                return;
            const url = `/api/images/view?${new URLSearchParams({ recordId, subDir, fileName, v: `${stat.mtimeMs}-${stat.size}` })}`;
            (auto ? autoImages : manualImages).push({ name: fileName, url });
        };
        for (const entry of entries) {
            if (entry.isDirectory() && ['AUTO', 'MANUAL'].includes(entry.name.toUpperCase())) {
                for (const file of await fs_1.default.promises.readdir(path_1.default.join(record.folder_path, entry.name), { withFileTypes: true })) {
                    if (file.isFile() && /\.(jpe?g|png)$/i.test(file.name))
                        await add(file.name, entry.name, entry.name.toUpperCase() === 'AUTO');
                }
            }
            else if (entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name))
                await add(entry.name, '', /_\d{2}\.jpe?g$/i.test(entry.name));
        }
        return { autoImages, manualImages };
    }
    async getImageFilePath(recordId, subDir, fileName) {
        const record = scanFolder_repository_1.scanFolderRepository.findById(recordId);
        if (!record)
            throw new DomainError_1.NotFoundError('Không tìm thấy bản ghi');
        if (!['', 'AUTO', 'MANUAL'].includes(subDir.toUpperCase()) || path_1.default.basename(fileName) !== fileName || !/\.(jpe?g|png)$/i.test(fileName))
            throw new DomainError_1.ForbiddenError('File ảnh không hợp lệ');
        const root = await fs_1.default.promises.realpath(record.folder_path);
        const resolved = await fs_1.default.promises.realpath(path_1.default.join(root, subDir, fileName));
        const relative = path_1.default.relative(root, resolved);
        if (path_1.default.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path_1.default.sep))
            throw new DomainError_1.ForbiddenError('Ảnh nằm ngoài folder cho phép');
        if (!(await fs_1.default.promises.stat(resolved)).isFile())
            throw new DomainError_1.NotFoundError('Không phải file ảnh');
        return resolved;
    }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
