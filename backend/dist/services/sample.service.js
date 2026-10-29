"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleService = exports.SampleService = void 0;
const uuid_1 = require("uuid");
const sample_repository_1 = require("../repositories/sample.repository");
const Sample_1 = require("../domain/entities/Sample");
const DomainError_1 = require("../domain/errors/DomainError");
const config_1 = require("../config/config");
const audit_service_1 = require("./audit.service");
const realtime_service_1 = require("./realtime.service");
class SampleService {
    sampleRepo = new sample_repository_1.SampleRepository();
    toResponseDto(sample) {
        const warningDays = config_1.config.expiryWarningDays;
        const expiryStatus = sample.deleted_at
            ? 'none'
            : (0, Sample_1.calculateExpiryStatus)(sample.expiry_date, warningDays);
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
    getPaginated(query = {}) {
        const result = this.sampleRepo.findMany(query, false);
        return {
            ...result,
            items: result.items.map((s) => this.toResponseDto(s)),
        };
    }
    getDeleted() {
        const samples = this.sampleRepo.findDeleted();
        return samples.map((s) => this.toResponseDto(s));
    }
    getById(id) {
        const sample = this.sampleRepo.findById(id);
        if (!sample)
            throw new DomainError_1.NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);
        return this.toResponseDto(sample);
    }
    create(dto, userId, meta) {
        const now = new Date().toISOString();
        const nextNo = dto.no !== undefined && dto.no !== null ? dto.no : this.sampleRepo.getMaxNo() + 1;
        const sample = {
            id: (0, uuid_1.v4)(),
            no: nextNo,
            sample_code: dto.sample_code,
            quantity: dto.quantity !== undefined ? dto.quantity : 1,
            item_code: dto.item_code || null,
            layer: dto.layer || null,
            program_name: dto.program_name || null,
            made_date: dto.made_date || null,
            expiry_date: dto.expiry_date || null,
            comment: dto.comment || null,
            excel_row_id: (0, uuid_1.v4)(),
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
            audit_service_1.auditService.log({
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
        realtime_service_1.realtimeService.emitSampleCreated(responseDto);
        return responseDto;
    }
    update(id, dto, userId, meta) {
        const existing = this.sampleRepo.findById(id);
        if (!existing)
            throw new DomainError_1.NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);
        const now = new Date().toISOString();
        const updates = {
            updated_at: now,
            updated_by: userId || null,
        };
        if (dto.no !== undefined)
            updates.no = dto.no;
        if (dto.sample_code !== undefined)
            updates.sample_code = dto.sample_code;
        if (dto.quantity !== undefined)
            updates.quantity = dto.quantity;
        if (dto.item_code !== undefined)
            updates.item_code = dto.item_code;
        if (dto.layer !== undefined)
            updates.layer = dto.layer;
        if (dto.program_name !== undefined)
            updates.program_name = dto.program_name;
        if (dto.made_date !== undefined)
            updates.made_date = dto.made_date || null;
        if (dto.expiry_date !== undefined)
            updates.expiry_date = dto.expiry_date || null;
        if (dto.comment !== undefined)
            updates.comment = dto.comment;
        this.sampleRepo.update(id, updates);
        // Prepare diff for audit
        const oldValue = {};
        const newValue = {};
        for (const [key, val] of Object.entries(updates)) {
            if (key !== 'updated_at' && key !== 'updated_by') {
                const existingVal = existing[key];
                if (existingVal !== val) {
                    oldValue[key] = existingVal;
                    newValue[key] = val;
                }
            }
        }
        if (meta && Object.keys(newValue).length > 0) {
            audit_service_1.auditService.log({
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
        const updatedSample = this.sampleRepo.findById(id);
        const responseDto = this.toResponseDto(updatedSample);
        // Socket.IO realtime push after DB commit
        realtime_service_1.realtimeService.emitSampleUpdated(responseDto);
        return responseDto;
    }
    softDelete(id, userId, meta) {
        const existing = this.sampleRepo.findById(id);
        if (!existing)
            throw new DomainError_1.NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);
        const success = this.sampleRepo.softDelete(id, userId);
        if (!success)
            return;
        const deletedAt = new Date().toISOString();
        if (meta) {
            audit_service_1.auditService.log({
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
        realtime_service_1.realtimeService.emitSampleDeleted(id, deletedAt);
    }
    softDeleteBatch(ids, userId, meta) {
        const deletedCount = this.sampleRepo.softDeleteBatch(ids, userId);
        if (meta && deletedCount > 0) {
            audit_service_1.auditService.log({
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
            realtime_service_1.realtimeService.emitSamplesBulkDeleted(ids);
        }
        return deletedCount;
    }
    restore(id, userId, meta) {
        const existing = this.sampleRepo.findById(id);
        if (!existing)
            throw new DomainError_1.NotFoundError(`Mẫu thử không tồn tại với ID ${id}`);
        const success = this.sampleRepo.restore(id, userId);
        if (!success) {
            throw new Error('Không thể khôi phục mẫu thử');
        }
        const restored = this.sampleRepo.findById(id);
        const responseDto = this.toResponseDto(restored);
        if (meta) {
            audit_service_1.auditService.log({
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
        realtime_service_1.realtimeService.emitSampleRestored(responseDto);
        return responseDto;
    }
}
exports.SampleService = SampleService;
exports.sampleService = new SampleService();
