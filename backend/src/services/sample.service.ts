import { v4 as uuidv4 } from 'uuid';
import { SampleRepository } from '../repositories/sample.repository';
import { Sample, calculateExpiryStatus } from '../domain/entities/Sample';
import { CreateSampleDto, UpdateSampleDto, SampleResponseDto } from '../dtos/sample.dto';
import { PaginationQuery, PaginatedResponse } from '../dtos/pagination.dto';
import { NotFoundError } from '../domain/errors/DomainError';
import { config } from '../config/config';
import { auditService } from './audit.service';
import { realtimeService } from './realtime.service';

export class SampleService {
  private sampleRepo = new SampleRepository();

  toResponseDto(sample: Sample): SampleResponseDto {
    const warningDays = config.expiryWarningDays;
    const expiryStatus = sample.deleted_at
      ? 'none'
      : calculateExpiryStatus(sample.expiry_date, warningDays);

    return {
      id: sample.id,
      no: sample.no ?? null,
      sample_code: sample.sample_code,
      quantity: sample.quantity,
      item_code: sample.item_code ?? null,
      layer: sample.layer ?? null,
      program_name: sample.program_name ?? null,
      made_date: sample.made_date ?? null,
      expiry_date: sample.expiry_date ?? null,
      comment: sample.comment ?? null,
      excel_row_id: sample.excel_row_id ?? null,
      deleted_at: sample.deleted_at ?? null,
      deleted_by: sample.deleted_by ?? null,
      created_at: sample.created_at,
      created_by: sample.created_by ?? null,
      updated_at: sample.updated_at,
      updated_by: sample.updated_by ?? null,
      last_synced_at: sample.last_synced_at ?? null,
      expiry_status: expiryStatus,
    };
  }

  getPaginated(query: PaginationQuery = {}): PaginatedResponse<SampleResponseDto> {
    const result = this.sampleRepo.findMany(query, false);
    return {
      ...result,
      items: result.items.map((s) => this.toResponseDto(s)),
    };
  }

  getDeleted(): SampleResponseDto[] {
    const samples = this.sampleRepo.findDeleted();
    return samples.map((s) => this.toResponseDto(s));
  }

  getById(id: string): SampleResponseDto {
    const sample = this.sampleRepo.findById(id);
    if (!sample) throw new NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);
    return this.toResponseDto(sample);
  }

  create(
    dto: CreateSampleDto,
    userId?: string | null,
    meta?: { ip: string; deviceName: string; actorName?: string }
  ): SampleResponseDto {
    const now = new Date().toISOString();
    const nextNo = dto.no !== undefined && dto.no !== null ? dto.no : this.sampleRepo.getMaxNo() + 1;

    const sample: Sample = {
      id: uuidv4(),
      no: nextNo,
      sample_code: dto.sample_code,
      quantity: dto.quantity !== undefined ? dto.quantity : 1,
      item_code: dto.item_code || null,
      layer: dto.layer || null,
      program_name: dto.program_name || null,
      made_date: dto.made_date || null,
      expiry_date: dto.expiry_date || null,
      comment: dto.comment || null,
      excel_row_id: uuidv4(),
      deleted_at: null,
      deleted_by: null,
      created_at: now,
      created_by: userId || null,
      updated_at: now,
      updated_by: userId || null,
    };

    this.sampleRepo.insert(sample);

    // Audit log
    if (meta) {
      auditService.log({
        action: 'sample.create',
        actor_id: userId || null,
        actor_name: meta.actorName || null,
        ip: meta.ip,
        device_name: meta.deviceName,
        entity_type: 'sample',
        entity_id: sample.id,
        new_value: {
          sample_code: sample.sample_code,
          quantity: sample.quantity,
          expiry_date: sample.expiry_date,
        },
        result: 'success',
      });
    }

    const responseDto = this.toResponseDto(sample);

    // Socket.IO realtime push after DB commit
    realtimeService.emitSampleCreated(responseDto);

    return responseDto;
  }

  update(
    id: string,
    dto: UpdateSampleDto,
    userId?: string | null,
    meta?: { ip: string; deviceName: string; actorName?: string }
  ): SampleResponseDto {
    const existing = this.sampleRepo.findById(id);
    if (!existing) throw new NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);

    const now = new Date().toISOString();
    const updates: Partial<Sample> = {
      updated_at: now,
      updated_by: userId || null,
    };

    if (dto.no !== undefined) updates.no = dto.no;
    if (dto.sample_code !== undefined) updates.sample_code = dto.sample_code;
    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.item_code !== undefined) updates.item_code = dto.item_code;
    if (dto.layer !== undefined) updates.layer = dto.layer;
    if (dto.program_name !== undefined) updates.program_name = dto.program_name;
    if (dto.made_date !== undefined) updates.made_date = dto.made_date || null;
    if (dto.expiry_date !== undefined) updates.expiry_date = dto.expiry_date || null;
    if (dto.comment !== undefined) updates.comment = dto.comment;

    this.sampleRepo.update(id, updates);

    // Prepare diff for audit
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'updated_at' && key !== 'updated_by') {
        const existingVal = (existing as any)[key];
        if (existingVal !== val) {
          oldValue[key] = existingVal;
          newValue[key] = val;
        }
      }
    }

    if (meta && Object.keys(newValue).length > 0) {
      auditService.log({
        action: 'sample.update',
        actor_id: userId || null,
        actor_name: meta.actorName || null,
        ip: meta.ip,
        device_name: meta.deviceName,
        entity_type: 'sample',
        entity_id: id,
        old_value: oldValue,
        new_value: newValue,
        result: 'success',
      });
    }

    const updatedSample = this.sampleRepo.findById(id)!;
    const responseDto = this.toResponseDto(updatedSample);

    // Socket.IO realtime push after DB commit
    realtimeService.emitSampleUpdated(responseDto);

    return responseDto;
  }

  softDelete(
    id: string,
    userId?: string | null,
    meta?: { ip: string; deviceName: string; actorName?: string }
  ): void {
    const existing = this.sampleRepo.findById(id);
    if (!existing) throw new NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);

    const success = this.sampleRepo.softDelete(id, userId);
    if (!success) return;

    const deletedAt = new Date().toISOString();

    if (meta) {
      auditService.log({
        action: 'sample.soft_delete',
        actor_id: userId || null,
        actor_name: meta.actorName || null,
        ip: meta.ip,
        device_name: meta.deviceName,
        entity_type: 'sample',
        entity_id: id,
        old_value: { sample_code: existing.sample_code, no: existing.no },
        result: 'success',
      });
    }

    realtimeService.emitSampleDeleted(id, deletedAt);
  }

  softDeleteBatch(
    ids: string[],
    userId?: string | null,
    meta?: { ip: string; deviceName: string; actorName?: string }
  ): number {
    const deletedCount = this.sampleRepo.softDeleteBatch(ids, userId);

    if (meta && deletedCount > 0) {
      auditService.log({
        action: 'sample.bulk_delete',
        actor_id: userId || null,
        actor_name: meta.actorName || null,
        ip: meta.ip,
        device_name: meta.deviceName,
        entity_type: 'sample',
        new_value: { count: deletedCount, ids },
        result: 'success',
      });
    }

    if (deletedCount > 0) {
      realtimeService.emitSamplesBulkDeleted(ids);
    }

    return deletedCount;
  }

  restore(
    id: string,
    userId?: string | null,
    meta?: { ip: string; deviceName: string; actorName?: string }
  ): SampleResponseDto {
    const existing = this.sampleRepo.findById(id);
    if (!existing) throw new NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);

    const success = this.sampleRepo.restore(id, userId);
    if (!success) {
      throw new Error('Không thể khôi phục mẫu thử');
    }

    const restored = this.sampleRepo.findById(id)!;
    const responseDto = this.toResponseDto(restored);

    if (meta) {
      auditService.log({
        action: 'sample.restore',
        actor_id: userId || null,
        actor_name: meta.actorName || null,
        ip: meta.ip,
        device_name: meta.deviceName,
        entity_type: 'sample',
        entity_id: id,
        new_value: { sample_code: restored.sample_code },
        result: 'success',
      });
    }

    realtimeService.emitSampleRestored(responseDto);

    return responseDto;
  }
}

export const sampleService = new SampleService();
