"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleController = exports.SampleController = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const sample_repository_1 = require("../repositories/sample.repository");
const sample_service_1 = require("../services/sample.service");
class SampleController {
    exportExcel = async (req, res, next) => {
        try {
            const repo = new sample_repository_1.SampleRepository();
            const query = { search: req.query.search ? String(req.query.search) : undefined, expiryStatus: req.query.expiryStatus,
                sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined, sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc', limit: 100 };
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet('Mẫu thử');
            sheet.columns = ['no', 'sample_code', 'quantity', 'item_code', 'layer', 'program_name', 'made_date', 'expiry_date', 'comment'].map(key => ({ header: key, key, width: 22 }));
            let page = 1;
            for (;;) {
                const result = repo.findMany({ ...query, page });
                result.items.forEach(item => sheet.addRow(item));
                if (page++ >= result.totalPages)
                    break;
            }
            res.attachment('samples.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        }
        catch (err) {
            next(err);
        }
    };
    getAll = async (req, res, next) => {
        try {
            const searchFields = req.query.searchFields
                ? Array.isArray(req.query.searchFields)
                    ? req.query.searchFields
                    : [String(req.query.searchFields)]
                : undefined;
            const result = sample_service_1.sampleService.getPaginated({
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
                sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
                search: req.query.search ? String(req.query.search) : undefined,
                searchFields,
                expiryStatus: req.query.expiryStatus,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    };
    getDeleted = async (_req, res, next) => {
        try {
            const result = sample_service_1.sampleService.getDeleted();
            res.status(200).json({
                success: true,
                data: { items: result },
            });
        }
        catch (err) {
            next(err);
        }
    };
    getById = async (req, res, next) => {
        try {
            const result = sample_service_1.sampleService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    };
    create = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
                actorName: req.user?.display_name,
            };
            const result = sample_service_1.sampleService.create(req.body, req.user?.id, meta);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    };
    update = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
                actorName: req.user?.display_name,
            };
            const result = sample_service_1.sampleService.update(req.params.id, req.body, req.user?.id, meta);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    };
    delete = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
                actorName: req.user?.display_name,
            };
            sample_service_1.sampleService.softDelete(req.params.id, req.user?.id, meta);
            res.status(200).json({
                success: true,
                data: { message: 'Đã xóa mềm mẫu thử thành công' },
            });
        }
        catch (err) {
            next(err);
        }
    };
    deleteBulk = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
                actorName: req.user?.display_name,
            };
            const count = sample_service_1.sampleService.softDeleteBatch(req.body.ids, req.user?.id, meta);
            res.status(200).json({
                success: true,
                data: { message: `Đã xóa mềm ${count} mẫu thử thành công`, count },
            });
        }
        catch (err) {
            next(err);
        }
    };
    restore = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
                actorName: req.user?.display_name,
            };
            const result = sample_service_1.sampleService.restore(req.params.id, req.user?.id, meta);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    };
}
exports.SampleController = SampleController;
exports.sampleController = new SampleController();
