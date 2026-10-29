export interface Sample {
  id: string;
  no?: number | null;
  sample_code: string;
  quantity: number;
  item_code?: string | null;
  layer?: string | null;
  program_name?: string | null;
  made_date?: string | null;
  expiry_date?: string | null;
  comment?: string | null;
  excel_row_id?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
  last_synced_at?: string | null;
  sync_hash?: string | null;
}

export type ExpiryStatus = 'expired' | 'expiring' | 'valid' | 'none';

export function calculateExpiryStatus(expiryDateStr: string | null | undefined, warningDays: number): ExpiryStatus {
  if (!expiryDateStr) return 'none';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return 'none';
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'expired';
  }
  if (diffDays <= warningDays) {
    return 'expiring';
  }
  return 'valid';
}
