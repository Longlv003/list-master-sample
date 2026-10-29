export interface CreateDeviceDto {
  ip_address: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateDeviceDto {
  ip_address?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface DeviceResponseDto {
  id: string;
  ip_address: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
