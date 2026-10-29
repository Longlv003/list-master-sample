import { request } from './api.client';
import { UserItem, UserFormData } from '../types/user.types';

export const userApi = {
  getAll: async (): Promise<{ items: UserItem[] }> => {
    return request('/api/v1/users');
  },

  getById: async (id: string): Promise<UserItem> => {
    return request(`/api/v1/users/${id}`);
  },

  create: async (data: UserFormData): Promise<UserItem> => {
    return request('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<UserFormData>): Promise<UserItem> => {
    return request(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggleActive: async (id: string): Promise<UserItem> => {
    return request(`/api/v1/users/${id}/toggle-active`, {
      method: 'PATCH',
    });
  },
};
