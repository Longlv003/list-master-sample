import { z } from 'zod';

export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD').refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Ngày không hợp lệ');
const fields = z.object({
  sampleCode: z.string().trim().max(200).optional(),
  item: z.string().trim().min(1).max(200),
  lot: z.string().trim().max(200).default(''),
  barcodeId: z.string().trim().min(1).max(200),
  quantity: z.number().finite().int().positive().optional(),
  layer: z.string().trim().max(100).optional(),
  programName: z.string().trim().max(500).optional(),
  manufactureDate: dateOnly,
  expiryDate: dateOnly,
});
export const createMasterSchema = fields.refine(value => value.expiryDate >= value.manufactureDate, { path: ['expiryDate'], message: 'Hạn dùng phải từ ngày làm mẫu trở đi' });
export const updateMasterSchema = fields.partial();
export const masterIdsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) });
export const masterQuerySchema = z.object({
  search: z.string().max(500).optional(), item: z.string().max(200).optional(),
  lot: z.string().max(200).optional(), barcodeId: z.string().max(200).optional(),
  status: z.enum(['all', 'valid', 'expiring', 'expired', 'unknown']).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(1000).default(50),
});
