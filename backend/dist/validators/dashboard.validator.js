"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = void 0;
const zod_1 = require("zod");
const masterSample_validator_1 = require("./masterSample.validator");
exports.dashboardQuerySchema = zod_1.z.object({
    itemCode: zod_1.z.string().max(200).optional(), lotId: zod_1.z.string().max(200).optional(), barcodeId: zod_1.z.string().max(200).optional(),
    scanNum: zod_1.z.coerce.number().int().nonnegative().optional(), cvrNum: zod_1.z.coerce.number().int().nonnegative().optional(),
    fromDate: masterSample_validator_1.dateOnly.optional(), toDate: masterSample_validator_1.dateOnly.optional(), hasWarning: zod_1.z.enum(['true', 'false']).optional(),
    page: zod_1.z.coerce.number().int().positive().default(1), limit: zod_1.z.coerce.number().int().positive().max(1000).default(50),
    sortBy: zod_1.z.enum(['run_date', 'item_code', 'folder_scan_num', 'cvr_machine_num', 'barcode_id', 'created_at']).optional(),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).optional(),
}).refine(value => !value.fromDate || !value.toDate || value.fromDate <= value.toDate, { path: ['toDate'], message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi' });
