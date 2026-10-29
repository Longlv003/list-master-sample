export type ExpiryStatus = 'expired' | 'expiring' | 'valid' | 'none';

export interface Sample {
  id: string;
  no: number | null;
  sample_code: string;
  quantity: number;
  item_code: string | null;
  layer: string | null;
  program_name: string | null;
  made_date: string | null;
  expiry_date: string | null;
  comment: string | null;
  excel_row_id: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  last_synced_at: string | null;
  expiry_status: ExpiryStatus;
}

export interface SampleFormData {
  no?: number | null;
  sample_code: string;
  quantity: number;
  item_code?: string;
  layer?: string;
  program_name?: string;
  made_date?: string;
  expiry_date?: string;
  comment?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
