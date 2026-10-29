import { request } from './api.client';
import { Sample, SampleFormData, PaginatedResult } from '../types/sample.types';

export interface SampleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  expiryStatus?: string;
}

export const sampleApi = {
  exportUrl: (params: SampleQueryParams = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
    return '/api/v1/samples/export?' + query.toString();
  },
  getAll: async (params: SampleQueryParams = {}): Promise<PaginatedResult<Sample>> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.expiryStatus && params.expiryStatus !== 'all') {
      query.set('expiryStatus', params.expiryStatus);
    }

    const queryString = query.toString();
    return request(`/api/v1/samples${queryString ? `?${queryString}` : ''}`);
  },

  getDeleted: async (): Promise<{ items: Sample[] }> => {
    return request('/api/v1/samples/deleted');
  },

  getById: async (id: string): Promise<Sample> => {
    return request(`/api/v1/samples/${id}`);
  },

  create: async (data: SampleFormData): Promise<Sample> => {
    return request('/api/v1/samples', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<SampleFormData>): Promise<Sample> => {
    return request(`/api/v1/samples/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request(`/api/v1/samples/${id}`, {
      method: 'DELETE',
    });
  },

  deleteBulk: async (ids: string[]): Promise<{ count: number }> => {
    return request('/api/v1/samples', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  restore: async (id: string): Promise<Sample> => {
    return request(`/api/v1/samples/${id}/restore`, {
      method: 'POST',
    });
  },
};
