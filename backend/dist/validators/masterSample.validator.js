"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterQuerySchema = exports.masterIdsSchema = exports.updateMasterSchema = exports.createMasterSchema = exports.dateOnly = void 0;
const zod_1 = require("zod");
exports.dateOnly = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD').refine(value => {
    const parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Ngày không hợp lệ');
const fields = zod_1.z.object({
    sampleCode: zod_1.z.string().trim().max(200).optional(),
    item: zod_1.z.string().trim().min(1).max(200),
    lot: zod_1.z.string().trim().max(200).default(''),
    barcodeId: zod_1.z.string().trim().min(1).max(200),
    quantity: zod_1.z.number().finite().int().positive().optional(),
    layer: zod_1.z.string().trim().max(100).optional(),
    programName: zod_1.z.string().trim().max(500).optional(),
    manufactureDate: exports.dateOnly,
    expiryDate: exports.dateOnly,
});
exports.createMasterSchema = fields.refine(value => value.expiryDate >= value.manufactureDate, { path: ['expiryDate'], message: 'Hạn dùng phải từ ngày làm mẫu trở đi' });
exports.updateMasterSchema = fields.partial();
exports.masterIdsSchema = zod_1.z.object({ ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(1000) });
exports.masterQuerySchema = zod_1.z.object({
    search: zod_1.z.string().max(500).optional(), item: zod_1.z.string().max(200).optional(),
    lot: zod_1.z.string().max(200).optional(), barcodeId: zod_1.z.string().max(200).optional(),
    status: zod_1.z.enum(['all', 'valid', 'expiring', 'expired', 'unknown']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1), limit: zod_1.z.coerce.number().int().min(1).max(1000).default(50),
});
