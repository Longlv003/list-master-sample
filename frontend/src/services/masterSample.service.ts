import { request } from './api.client';

export interface MasterSample {
  id: string;
  sampleCode?: string;
  item: string;
  lot: string;
  barcodeId: string;
  manufactureDate: string;
  expiryDate: string;
  quantity?: number;
  layer?: string;
  programName?: string;
  comment?: string;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: 'valid' | 'expiring' | 'expired' | 'unknown';
  daysRemaining: number;
}

export interface MasterSampleFilter {
  search?: string;
  item?: string;
  lot?: string;
  barcodeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface MasterSampleResponse {
  data: MasterSample[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const masterSampleClientService = {
  async getList(filter: MasterSampleFilter = {}): Promise<MasterSampleResponse> {
    const params = new URLSearchParams();
    if (filter.search) params.append('search', filter.search);
    if (filter.item) params.append('item', filter.item);
    if (filter.lot) params.append('lot', filter.lot);
    if (filter.barcodeId) params.append('barcodeId', filter.barcodeId);
    if (filter.status && filter.status !== 'all') params.append('status', filter.status);
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));

    const res = await fetch(`/api/master-samples?${params.toString()}`, {
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
    return json;
  },

  async getDeletedList(): Promise<{ success: boolean; data: MasterSample[] }> {
    const res = await fetch('/api/master-samples/deleted', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Không tải được danh sách đã xóa');
    return data;
  },

  async create(data: {
    sampleCode?: string;
    item: string;
    lot: string;
    barcodeId: string;
    quantity?: number;
    layer?: string;
    programName?: string;
    manufactureDate: string;
    expiryDate: string;
  }): Promise<MasterSample> {
    return request('/api/master-samples', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: {
      sampleCode?: string;
      item?: string;
      lot?: string;
      barcodeId?: string;
      quantity?: number;
      layer?: string;
      programName?: string;
      manufactureDate?: string;
      expiryDate?: string;
    }
  ): Promise<MasterSample> {
    return request(`/api/master-samples/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(ids: string[]): Promise<any> {
    return request('/api/master-samples', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  async restore(ids: string[]): Promise<any> {
    return request('/api/master-samples/restore', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  getExportUrl(filter: MasterSampleFilter = {}): string {
    const params = new URLSearchParams();
    if (filter.search) params.append('search', filter.search);
    if (filter.item) params.append('item', filter.item);
    if (filter.lot) params.append('lot', filter.lot);
    if (filter.barcodeId) params.append('barcodeId', filter.barcodeId);
    if (filter.status && filter.status !== 'all') params.append('status', filter.status);
    return `/api/master-samples/export?${params.toString()}`;
  },
};
