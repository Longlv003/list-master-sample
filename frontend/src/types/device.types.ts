export interface DeviceItem {
  id: string;
  ip_address: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviceFormData {
  ip_address: string;
  name: string;
  description?: string;
  is_active: boolean;
}
