import { z } from 'zod';

const ipv4Regex =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export const createDeviceSchema = z.object({
  ip_address: z.string().regex(ipv4Regex, 'Địa chỉ IP không đúng định dạng IPv4'),
  name: z.string().min(1, 'Tên thiết bị không được để trống').max(100),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateDeviceSchema = createDeviceSchema.partial();
