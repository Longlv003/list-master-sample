"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const exceljs_1 = __importDefault(require("exceljs"));
class DashboardController {
    async getDashboardData(req, res, next) {
        try {
            const { itemCode, lotId, barcodeId, scanNum, cvrNum, fromDate, toDate, hasWarning, page, limit, sortBy, sortOrder, } = req.query;
            const data = dashboard_service_1.dashboardService.getDashboardData({
                itemCode: itemCode,
                lotId: lotId,
                barcodeId: barcodeId,
                scanNum: scanNum ? parseInt(scanNum, 10) : undefined,
                cvrNum: cvrNum ? parseInt(cvrNum, 10) : undefined,
                fromDate: fromDate,
                toDate: toDate,
                hasWarning: hasWarning === 'true',
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 50,
                sortBy: sortBy,
                sortOrder: sortOrder === 'ASC' ? 'ASC' : 'DESC',
            });
            res.json({
                success: true,
                data: data.records,
                pagination: {
                    page: data.page,
                    limit: data.limit,
                    total: data.total,
                    totalPages: data.totalPages,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    async triggerRefresh(_req, res, next) {
        try {
            const result = await dashboard_service_1.dashboardService.triggerRefresh();
            res.json({
                success: true,
                message: result.status === 'success' ? 'Đã hoàn thành quét UNC' : 'Lượt quét có lỗi, xem chi tiết trạng thái',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async exportExcel(req, res, next) {
        try {
            const { itemCode, lotId, barcodeId, scanNum, cvrNum, fromDate, toDate, hasWarning, sortBy, sortOrder } = req.query;
            const records = dashboard_service_1.dashboardService.getExportData({
                hasWarning: hasWarning === 'true', sortBy: sortBy, sortOrder: sortOrder === 'ASC' ? 'ASC' : 'DESC',
                itemCode: itemCode,
                lotId: lotId,
                barcodeId: barcodeId,
                scanNum: scanNum ? parseInt(scanNum, 10) : undefined,
                cvrNum: cvrNum ? parseInt(cvrNum, 10) : undefined,
                fromDate: fromDate,
                toDate: toDate,
            });
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet('Dashboard Master Sample');
            sheet.columns = [
                { header: 'Sample Code', key: 'sample_code', width: 20 },
                { header: 'Cảnh báo mapping', key: 'warning_message', width: 40 },
                { header: 'Cảnh báo dữ liệu', key: 'metadata_warning', width: 40 },
                { header: 'Cảnh báo đối chiếu', key: 'match_warning', width: 40 },
                { header: 'Nguồn', key: 'source_status', width: 14 },
                { header: 'Date', key: 'run_date', width: 14 },
                { header: 'Item', key: 'item_code', width: 15 },
                { header: 'Lot', key: 'lot_id', width: 15 },
                { header: 'Scan', key: 'folder_scan_num', width: 10 },
                { header: 'CVR', key: 'cvr_machine_num', width: 10 },
                { header: 'Barcode', key: 'barcode_id', width: 16 },
                { header: 'Program', key: 'job_name', width: 30 },
                { header: 'Path', key: 'folder_path', width: 60 },
            ];
            // Format header
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F497D' },
            };
            for (const rec of records) {
                // Chống Excel Formula Injection bằng cách prefix ' nếu bắt đầu bằng =, +, -, @
                const sanitizeText = (val) => {
                    if (!val)
                        return '';
                    const str = String(val);
                    if (/^[=+\-@]/.test(str)) {
                        return `'${str}`;
                    }
                    return str;
                };
                const row = sheet.addRow({
                    sample_code: sanitizeText(rec.sample_code), warning_message: sanitizeText(rec.warning_message),
                    metadata_warning: sanitizeText(rec.metadata_warning), match_warning: sanitizeText(rec.match_warning), source_status: rec.source_status,
                    run_date: rec.run_date,
                    item_code: sanitizeText(rec.item_code),
                    lot_id: sanitizeText(rec.lot_id),
                    folder_scan_num: rec.folder_scan_num,
                    cvr_machine_num: rec.cvr_machine_num,
                    barcode_id: sanitizeText(rec.barcode_id),
                    job_name: sanitizeText(rec.job_name),
                    folder_path: rec.folder_path,
                });
                // Đảm bảo barcode, item, lot là kiểu text
                row.getCell('item_code').numFmt = '@';
                row.getCell('lot_id').numFmt = '@';
                row.getCell('barcode_id').numFmt = '@';
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="dashboard_export_${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
exports.dashboardController = new DashboardController();
