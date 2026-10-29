"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkDeleteSamplesSchema = exports.updateSampleSchema = exports.createSampleSchema = void 0;
const zod_1 = require("zod");
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
exports.createSampleSchema = zod_1.z.object({
    no: zod_1.z.number().int().positive().nullable().optional(),
    sample_code: zod_1.z.string().min(1, 'Mã mẫu thử không được để trống'),
    quantity: zod_1.z.number().int().min(1, 'Số lượng tối thiểu là 1').default(1),
    item_code: zod_1.z.string().nullable().optional(),
    layer: zod_1.z.string().nullable().optional(),
    program_name: zod_1.z.string().nullable().optional(),
    made_date: zod_1.z
        .string()
        .regex(dateRegex, 'Ngày làm mẫu phải có định dạng YYYY-MM-DD')
        .nullable()
        .optional()
        .or(zod_1.z.literal('')),
    expiry_date: zod_1.z
        .string()
        .regex(dateRegex, 'Ngày hết hạn phải có định dạng YYYY-MM-DD')
        .nullable()
        .optional()
        .or(zod_1.z.literal('')),
    comment: zod_1.z.string().nullable().optional(),
});
exports.updateSampleSchema = exports.createSampleSchema.partial();
exports.bulkDeleteSamplesSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'Danh sách id không được để trống'),
});
