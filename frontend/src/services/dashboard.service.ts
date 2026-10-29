import { request } from './api.client';

export interface DashboardRecord {
  id: string;
  run_date: string;
  year: number;
  month: number;
  day: number;
  item_code: string;
  lot_id: string;
  barcode_id: string;
  job_name: string;
  scan_machine_raw: string | null;
  scan_machine_num: number | null;
  folder_scan_num: number;
  cvr_machine_num: number;
  folder_path: string;
  auto_images_count: number;
  manual_images_count: number;
  mapping_warning: number;
  warning_message: string | null;
  source_status: string;
  sample_code?: string;
  metadata_warning?: string | null;
  match_warning?: string;
}

export interface DashboardFilter {
  itemCode?: string;
  lotId?: string;
  barcodeId?: string;
  scanNum?: number;
  cvrNum?: number;
  fromDate?: string;
  toDate?: string;
  hasWarning?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DashboardResponse {
  data: DashboardRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const dashboardService = {
  async getDashboardData(filter: DashboardFilter = {}): Promise<DashboardResponse> {
    const params = new URLSearchParams();
    if (filter.itemCode) params.append('itemCode', filter.itemCode);
    if (filter.lotId) params.append('lotId', filter.lotId);
    if (filter.barcodeId) params.append('barcodeId', filter.barcodeId);
    if (filter.scanNum !== undefined) params.append('scanNum', String(filter.scanNum));
    if (filter.cvrNum !== undefined) params.append('cvrNum', String(filter.cvrNum));
    if (filter.fromDate) params.append('fromDate', filter.fromDate);
    if (filter.toDate) params.append('toDate', filter.toDate);
    if (filter.hasWarning) params.append('hasWarning', 'true');
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);

    const res = await fetch(`/api/dashboard?${params.toString()}`, {
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
    return json;
  },

  async triggerRefresh(): Promise<any> {
    return request('/api/dashboard/refresh', {
      method: 'POST',
    });
  },

  async getScanStatus(): Promise<{ running: boolean; scanned: number; addedOrUpdated: number; status: string; errors: string[] }> {
    return request('/api/dashboard/scan-status');
  },

  async getFolderImages(recordId: string): Promise<{
    autoImages: { name: string; url: string }[];
    manualImages: { name: string; url: string }[];
  }> {
    return request(`/api/images/list?recordId=${recordId}`);
  },

  getExportUrl(filter: DashboardFilter = {}): string {
    const params = new URLSearchParams();
    if (filter.itemCode) params.append('itemCode', filter.itemCode);
    if (filter.lotId) params.append('lotId', filter.lotId);
    if (filter.barcodeId) params.append('barcodeId', filter.barcodeId);
    if (filter.scanNum !== undefined) params.append('scanNum', String(filter.scanNum));
    if (filter.cvrNum !== undefined) params.append('cvrNum', String(filter.cvrNum));
    if (filter.fromDate) params.append('fromDate', filter.fromDate);
    if (filter.toDate) params.append('toDate', filter.toDate);
    if (filter.hasWarning) params.append('hasWarning', 'true');
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);
    return `/api/dashboard/export?${params.toString()}`;
  },
};
