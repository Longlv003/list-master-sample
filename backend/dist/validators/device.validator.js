"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeviceSchema = exports.createDeviceSchema = void 0;
const zod_1 = require("zod");
const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
exports.createDeviceSchema = zod_1.z.object({
    ip_address: zod_1.z.string().regex(ipv4Regex, 'Địa chỉ IP không đúng định dạng IPv4'),
    name: zod_1.z.string().min(1, 'Tên thiết bị không được để trống').max(100),
    description: zod_1.z.string().nullable().optional(),
    is_active: zod_1.z.boolean().optional().default(true),
});
exports.updateDeviceSchema = exports.createDeviceSchema.partial();
