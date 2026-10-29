import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và ký tự . _ -'),
  password: z.string().min(4, 'Mật khẩu tối thiểu 4 ký tự'),
  display_name: z.string().min(1, 'Tên hiển thị không được để trống'),
  perm_add: z.boolean().optional(),
  perm_update: z.boolean().optional(),
  perm_delete: z.boolean().optional(),
  perm_restore: z.boolean().optional(),
  perm_manage_users: z.boolean().optional(),
  perm_view_audit_logs: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  password: z.string().min(4, 'Mật khẩu tối thiểu 4 ký tự').optional().or(z.literal('')),
  display_name: z.string().min(1, 'Tên hiển thị không được để trống').optional(),
  perm_add: z.boolean().optional(),
  perm_update: z.boolean().optional(),
  perm_delete: z.boolean().optional(),
  perm_restore: z.boolean().optional(),
  perm_manage_users: z.boolean().optional(),
  perm_view_audit_logs: z.boolean().optional(),
});
