"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterSampleController = exports.MasterSampleController = void 0;
const masterSample_service_1 = require("../services/masterSample.service");
const exceljs_1 = __importDefault(require("exceljs"));
class MasterSampleController {
    async getList(req, res, next) {
        try {
            const { search, item, lot, barcodeId, status, page, limit } = req.query;
            const result = masterSample_service_1.masterSampleService.getList({
                search: search,
                item: item,
                lot: lot,
                barcodeId: barcodeId,
                status: status,
                includeDeleted: false,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 50,
            });
            res.json({
                success: true,
                data: result.items,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    async getDeleted(req, res, next) {
        try {
            const items = masterSample_service_1.masterSampleService.getDeletedList();
            res.json({
                success: true,
                data: items,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const { sampleCode, item, lot, barcodeId, quantity, layer, programName, manufactureDate, expiryDate } = req.body;
            const username = req.user?.username || 'anonymous';
            const created = await masterSample_service_1.masterSampleService.create({
                sampleCode,
                item,
                lot,
                barcodeId,
                quantity,
                layer,
                programName,
                manufactureDate,
                expiryDate,
                username,
            });
            res.status(201).json({
                success: true,
                message: 'Thêm Master Sample thành công',
                data: created,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { sampleCode, item, lot, barcodeId, quantity, layer, programName, manufactureDate, expiryDate } = req.body;
            const username = req.user?.username || 'anonymous';
            const updated = await masterSample_service_1.masterSampleService.update(id, {
                sampleCode,
                item,
                lot,
                barcodeId,
                quantity,
                layer,
                programName,
                manufactureDate,
                expiryDate,
                username,
            });
            res.json({
                success: true,
                message: 'Cập nhật Master Sample thành công',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const { ids } = req.body;
            const idList = Array.isArray(ids) ? ids : [ids];
            const username = req.user?.username || 'anonymous';
            const count = await masterSample_service_1.masterSampleService.softDelete(idList, username);
            res.json({
                success: true,
                message: `Đã xóa mềm ${count} bản ghi`,
                count,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async restore(req, res, next) {
        try {
            const { ids } = req.body;
            const idList = Array.isArray(ids) ? ids : [ids];
            const count = await masterSample_service_1.masterSampleService.restore(idList, req.user.username);
            res.json({
                success: true,
                message: `Đã khôi phục ${count} bản ghi`,
                count,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async exportExcel(req, res, next) {
        try {
            const { search, item, lot, barcodeId, status } = req.query;
            const result = masterSample_service_1.masterSampleService.getList({
                search: search,
                item: item,
                lot: lot,
                barcodeId: barcodeId,
                status: status,
                includeDeleted: false,
                page: 1,
                limit: 100000,
            });
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet('Danh sách Master Sample');
            sheet.columns = [
                { header: 'Mã mẫu', key: 'sampleCode', width: 18 },
                { header: 'Item', key: 'item', width: 20 },
                { header: 'Lot', key: 'lot', width: 20 },
                { header: 'Barcode', key: 'barcodeId', width: 20 },
                { header: 'Số lượng', key: 'quantity', width: 12 },
                { header: 'Layer', key: 'layer', width: 10 },
                { header: 'Tên chương trình', key: 'programName', width: 30 },
                { header: 'Ngày làm', key: 'manufactureDate', width: 15 },
                { header: 'Ngày hết hạn', key: 'expiryDate', width: 15 },
                { header: 'Trạng thái', key: 'statusText', width: 15 },
            ];
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F497D' },
            };
            const sanitizeText = (val) => {
                if (!val)
                    return '';
                const str = String(val);
                if (/^[=+\-@]/.test(str)) {
                    return `'${str}`;
                }
                return str;
            };
            for (const it of result.items) {
                let statusText = 'Còn hạn';
                if (it.status === 'unknown')
                    statusText = 'Chưa xác định hạn dùng';
                if (it.status === 'expired')
                    statusText = 'Đã hết hạn';
                else if (it.status === 'expiring')
                    statusText = `Sắp hết hạn (${it.daysRemaining} ngày)`;
                const row = sheet.addRow({
                    sampleCode: sanitizeText(it.sampleCode),
                    item: sanitizeText(it.item),
                    lot: sanitizeText(it.lot),
                    barcodeId: sanitizeText(it.barcodeId),
                    quantity: it.quantity ?? 1,
                    layer: it.layer || '',
                    programName: sanitizeText(it.programName),
                    manufactureDate: it.manufactureDate,
                    expiryDate: it.expiryDate,
                    statusText,
                });
                row.getCell('item').numFmt = '@';
                row.getCell('lot').numFmt = '@';
                row.getCell('barcodeId').numFmt = '@';
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="master_sample_list_${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.MasterSampleController = MasterSampleController;
exports.masterSampleController = new MasterSampleController();
