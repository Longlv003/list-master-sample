import { request } from './api.client';
import { AuthUser } from '../types/auth.types';

export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<{ user: AuthUser }> => {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async (): Promise<void> => {
    return request('/api/v1/auth/logout', {
      method: 'POST',
    });
  },

  getMe: async (): Promise<{ user: AuthUser | null }> => {
    return request('/api/v1/auth/me');
  },
};
