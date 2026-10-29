import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createSampleSchema = z.object({
  no: z.number().int().positive().nullable().optional(),
  sample_code: z.string().min(1, 'Mã mẫu thử không được để trống'),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1').default(1),
  item_code: z.string().nullable().optional(),
  layer: z.string().nullable().optional(),
  program_name: z.string().nullable().optional(),
  made_date: z
    .string()
    .regex(dateRegex, 'Ngày làm mẫu phải có định dạng YYYY-MM-DD')
    .nullable()
    .optional()
    .or(z.literal('')),
  expiry_date: z
    .string()
    .regex(dateRegex, 'Ngày hết hạn phải có định dạng YYYY-MM-DD')
    .nullable()
    .optional()
    .or(z.literal('')),
  comment: z.string().nullable().optional(),
});

export const updateSampleSchema = createSampleSchema.partial();

export const bulkDeleteSamplesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Danh sách id không được để trống'),
});
