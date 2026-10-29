import { v4 as uuidv4 } from 'uuid';
import { masterSampleRepository, MasterSampleItem, MasterSampleFilter } from '../repositories/masterSample.repository';
import { config } from '../config/config';
import { realtimeService } from './realtime.service';
import { NotFoundError, ValidationError } from '../domain/errors/DomainError';
import { createMasterSchema, updateMasterSchema } from '../validators/masterSample.validator';

export class MasterSampleService {
  /**
   * Lấy danh sách Master Sample với phân trang, tìm kiếm, tính toán cảnh báo hết hạn
   */
  getList(filter: MasterSampleFilter): {
    items: (MasterSampleItem & { status: 'valid' | 'expiring' | 'expired' | 'unknown'; daysRemaining: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const all = masterSampleRepository.getAll(filter.includeDeleted);
    const warningDays = config.expiryWarningDays ?? 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tính trạng thái hạn
    const mapped = all.map((item) => {
      let daysRemaining = 9999;
      let status: 'valid' | 'expiring' | 'expired' | 'unknown' = 'unknown';

      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        if (!Number.isFinite(exp.getTime())) return { ...item, status: 'unknown' as const, daysRemaining: -1 };
        exp.setHours(0, 0, 0, 0);
        const diffMs = exp.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= warningDays) {
          status = 'expiring';
        } else {
          status = 'valid';
        }
      }

      return {
        ...item,
        status,
        daysRemaining,
      };
    });

    // Lọc theo filter
    let filtered = mapped;

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(
        (x) =>
          x.item.toLowerCase().includes(q) ||
          x.lot.toLowerCase().includes(q) ||
          (x.sampleCode && x.sampleCode.toLowerCase().includes(q)) ||
          x.barcodeId.toLowerCase().includes(q)
      );
    }

    if (filter.item) {
      filtered = filtered.filter((x) => x.item.toLowerCase().includes(filter.item!.toLowerCase()));
    }
    if (filter.lot) {
      filtered = filtered.filter((x) => x.lot.toLowerCase().includes(filter.lot!.toLowerCase()));
    }
    if (filter.barcodeId) {
      filtered = filtered.filter((x) => x.barcodeId.toLowerCase().includes(filter.barcodeId!.toLowerCase()));
    }
    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter((x) => x.status === filter.status);
    }

    // Sort: mặc định manufactureDate giảm dần
    const field = filter.sortBy || 'manufactureDate';
    filtered.sort((a, b) => (a[field] || '').localeCompare(b[field] || '') * (filter.sortOrder === 'ASC' ? 1 : -1));

    const total = filtered.length;
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, filter.limit || 50);
    const offset = (page - 1) * limit;

    const items = filtered.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Tạo mới Master Sample
   */
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
    username: string;
  }): Promise<MasterSampleItem> {
    const checked = createMasterSchema.safeParse(data);
    if (!checked.success) throw new ValidationError('Dữ liệu Master Sample không hợp lệ', checked.error.flatten());
    data = { ...checked.data, username: data.username };
    if (!data.item || !data.barcodeId) {
      throw new ValidationError('Item và Barcode không được để trống');
    }

    const now = new Date().toISOString();
    const newItem: MasterSampleItem = {
      id: uuidv4(),
      sampleCode: data.sampleCode ? data.sampleCode.trim() : undefined,
      item: data.item.trim(),
      lot: (data.lot || '').trim(),
      barcodeId: String(data.barcodeId).trim(),
      quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
      layer: data.layer ? data.layer.trim() : undefined,
      programName: data.programName ? data.programName.trim() : undefined,
      manufactureDate: data.manufactureDate,
      expiryDate: data.expiryDate,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.username,
      updatedBy: data.username,
    };

    const created = await masterSampleRepository.insert(newItem);
    realtimeService.broadcast('master.created', created);
    return created;
  }

  /**
   * Cập nhật Master Sample
   */
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
      username: string;
    }
  ): Promise<MasterSampleItem> {
    const existing = masterSampleRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy bản ghi Master Sample');
    }

    const checked = updateMasterSchema.safeParse(data);
    if (!checked.success) throw new ValidationError('Dữ liệu Master Sample không hợp lệ', checked.error.flatten());
    const supplied = Object.fromEntries(Object.entries(checked.data).filter(([, value]) => value !== undefined));
    const candidate = createMasterSchema.safeParse({ ...existing, ...supplied });
    if (!candidate.success) throw new ValidationError('Dữ liệu Master Sample không hợp lệ', candidate.error.flatten());
    const updated = await masterSampleRepository.update(id, {
      sampleCode: data.sampleCode !== undefined ? data.sampleCode.trim() : existing.sampleCode,
      item: data.item !== undefined ? data.item.trim() : existing.item,
      lot: data.lot !== undefined ? data.lot.trim() : existing.lot,
      barcodeId: data.barcodeId !== undefined ? String(data.barcodeId).trim() : existing.barcodeId,
      quantity: data.quantity !== undefined ? Number(data.quantity) : existing.quantity,
      layer: data.layer !== undefined ? data.layer.trim() : existing.layer,
      programName: data.programName !== undefined ? data.programName.trim() : existing.programName,
      manufactureDate: data.manufactureDate ?? existing.manufactureDate,
      expiryDate: data.expiryDate ?? existing.expiryDate,
      updatedBy: data.username,
    });

    if (!updated) {
      throw new NotFoundError('Cập nhật thất bại');
    }

    realtimeService.broadcast('master.updated', updated);
    return updated;
  }

  /**
   * Xóa mềm
   */
  async softDelete(ids: string[], username: string): Promise<number> {
    const count = await masterSampleRepository.softDelete(ids, username);
    if (count > 0) {
      realtimeService.broadcast('master.deleted', { ids, deletedBy: username });
    }
    return count;
  }

  /**
   * Khôi phục bản ghi đã xóa
   */
  async restore(ids: string[], username = 'system'): Promise<number> {
    const count = await masterSampleRepository.restore(ids, username);
    if (count > 0) {
      realtimeService.broadcast('master.restored', { ids });
    }
    return count;
  }

  /**
   * Lấy danh sách các bản ghi đã xóa mềm (để hiển thị modal Restore)
   */
  getDeletedList(): MasterSampleItem[] {
    return masterSampleRepository.getDeletedOnly();
  }
}

export const masterSampleService = new MasterSampleService();
