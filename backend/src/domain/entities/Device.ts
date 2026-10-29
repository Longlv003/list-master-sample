export interface Device {
  id: string;
  ip_address: string;
  name: string;
  description?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}
