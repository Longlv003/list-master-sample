import { z } from 'zod';
import { dateOnly } from './masterSample.validator';
export const dashboardQuerySchema = z.object({
  itemCode: z.string().max(200).optional(), lotId: z.string().max(200).optional(), barcodeId: z.string().max(200).optional(),
  scanNum: z.coerce.number().int().nonnegative().optional(), cvrNum: z.coerce.number().int().nonnegative().optional(),
  fromDate: dateOnly.optional(), toDate: dateOnly.optional(), hasWarning: z.enum(['true','false']).optional(),
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(1000).default(50),
  sortBy: z.enum(['run_date','item_code','folder_scan_num','cvr_machine_num','barcode_id','created_at']).optional(),
  sortOrder: z.enum(['ASC','DESC']).optional(),
}).refine(value => !value.fromDate || !value.toDate || value.fromDate <= value.toDate, {path: ['toDate'], message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi'});
