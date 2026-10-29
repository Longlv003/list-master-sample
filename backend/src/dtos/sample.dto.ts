import { ExpiryStatus } from '../domain/entities/Sample';

export interface CreateSampleDto {
  no?: number | null;
  sample_code: string;
  quantity?: number;
  item_code?: string | null;
  layer?: string | null;
  program_name?: string | null;
  made_date?: string | null;
  expiry_date?: string | null;
  comment?: string | null;
}

export interface UpdateSampleDto {
  no?: number | null;
  sample_code?: string;
  quantity?: number;
  item_code?: string | null;
  layer?: string | null;
  program_name?: string | null;
  made_date?: string | null;
  expiry_date?: string | null;
  comment?: string | null;
}

export interface SampleResponseDto {
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
