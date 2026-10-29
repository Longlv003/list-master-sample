import { request } from './api.client';
import { AuditLogItem } from '../types/audit.types';
import { PaginatedResult } from '../types/sample.types';

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  actor_id?: string;
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  query: async (params: AuditQueryParams = {}): Promise<PaginatedResult<AuditLogItem>> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.action) query.set('action', params.action);
    if (params.actor_id) query.set('actor_id', params.actor_id);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const queryString = query.toString();
    return request(`/api/v1/audit${queryString ? `?${queryString}` : ''}`);
  },

  exportUrl: (params: AuditQueryParams = {}): string => {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const queryString = query.toString();
    return `/api/v1/audit/export${queryString ? `?${queryString}` : ''}`;
  },
};
