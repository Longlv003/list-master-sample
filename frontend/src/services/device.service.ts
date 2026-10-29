import { request } from './api.client';
import { DeviceItem, DeviceFormData } from '../types/device.types';

export const deviceApi = {
  getAll: async (): Promise<{ items: DeviceItem[] }> => {
    return request('/api/v1/devices');
  },

  create: async (data: DeviceFormData): Promise<DeviceItem> => {
    return request('/api/v1/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<DeviceFormData>): Promise<DeviceItem> => {
    return request(`/api/v1/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggleActive: async (id: string): Promise<DeviceItem> => {
    return request(`/api/v1/devices/${id}/toggle-active`, {
      method: 'PATCH',
    });
  },

  exportJson: async (): Promise<string> => {
    return request('/api/v1/devices/export');
  },

  importJson: async (devicesJson: string): Promise<{ count: number }> => {
    return request('/api/v1/devices/import', {
      method: 'POST',
      body: devicesJson,
    });
  },
};
