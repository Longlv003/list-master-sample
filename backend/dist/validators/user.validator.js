"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
        .max(50, 'Tên đăng nhập tối đa 50 ký tự')
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và ký tự . _ -'),
    password: zod_1.z.string().min(4, 'Mật khẩu tối thiểu 4 ký tự'),
    display_name: zod_1.z.string().min(1, 'Tên hiển thị không được để trống'),
    perm_add: zod_1.z.boolean().optional(),
    perm_update: zod_1.z.boolean().optional(),
    perm_delete: zod_1.z.boolean().optional(),
    perm_restore: zod_1.z.boolean().optional(),
    perm_manage_users: zod_1.z.boolean().optional(),
    perm_view_audit_logs: zod_1.z.boolean().optional(),
});
exports.updateUserSchema = zod_1.z.object({
    password: zod_1.z.string().min(4, 'Mật khẩu tối thiểu 4 ký tự').optional().or(zod_1.z.literal('')),
    display_name: zod_1.z.string().min(1, 'Tên hiển thị không được để trống').optional(),
    perm_add: zod_1.z.boolean().optional(),
    perm_update: zod_1.z.boolean().optional(),
    perm_delete: zod_1.z.boolean().optional(),
    perm_restore: zod_1.z.boolean().optional(),
    perm_manage_users: zod_1.z.boolean().optional(),
    perm_view_audit_logs: zod_1.z.boolean().optional(),
});
