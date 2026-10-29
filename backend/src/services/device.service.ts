import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DeviceRepository } from '../repositories/device.repository';
import { Device } from '../domain/entities/Device';
import { CreateDeviceDto, UpdateDeviceDto, DeviceResponseDto } from '../dtos/device.dto';
import { ConflictError, NotFoundError } from '../domain/errors/DomainError';
import { createDeviceSchema } from '../validators/device.validator';
import { config } from '../config/config';

export class DeviceService {
  private deviceRepo = new DeviceRepository();
  private ipCache = new Map<string, string>();

  constructor() {
    this.refreshCache();
  }

  private refreshCache(): void {
    try {
      const devices = this.deviceRepo.findAll();
      this.ipCache.clear();
      for (const d of devices) {
        if (d.is_active) {
          this.ipCache.set(d.ip_address, d.name);
        }
      }
    } catch {
      // Table might not exist yet during migration
    }
  }

  resolveDeviceName(ip: string): string {
    // Normalize localhost / IPv6 loopback
    const normalizedIp = ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '');
    const cachedName = this.ipCache.get(normalizedIp);
    if (cachedName) return cachedName;

    const device = this.deviceRepo.findByIp(normalizedIp);
    if (device && device.is_active) {
      this.ipCache.set(normalizedIp, device.name);
      return device.name;
    }

    return `Unknown (IP: ${normalizedIp})`;
  }

  getAll(): DeviceResponseDto[] {
    const devices = this.deviceRepo.findAll();
    return devices.map((d) => this.toResponseDto(d));
  }

  getById(id: string): DeviceResponseDto {
    const device = this.deviceRepo.findById(id);
    if (!device) throw new NotFoundError(`Thiết bị không tồn tại với ID ${id}`);
    return this.toResponseDto(device);
  }

  create(dto: CreateDeviceDto): DeviceResponseDto {
    const existing = this.deviceRepo.findByIp(dto.ip_address);
    if (existing) {
      throw new ConflictError(`Địa chỉ IP ${dto.ip_address} đã được đăng ký cho thiết bị ${existing.name}`);
    }

    const now = new Date().toISOString();
    const device: Device = {
      id: uuidv4(),
      ip_address: dto.ip_address,
      name: dto.name,
      description: dto.description || null,
      is_active: dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : 1,
      created_at: now,
      updated_at: now,
    };

    this.deviceRepo.insert(device);
    this.refreshCache();
    return this.toResponseDto(device);
  }

  update(id: string, dto: UpdateDeviceDto): DeviceResponseDto {
    const device = this.deviceRepo.findById(id);
    if (!device) throw new NotFoundError(`Thiết bị không tồn tại với ID ${id}`);

    if (dto.ip_address && dto.ip_address !== device.ip_address) {
      const existing = this.deviceRepo.findByIp(dto.ip_address);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Địa chỉ IP ${dto.ip_address} đã được đăng ký cho thiết bị khác`);
      }
    }

    const updates: Partial<Device> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.ip_address !== undefined) updates.ip_address = dto.ip_address;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active ? 1 : 0;

    this.deviceRepo.update(id, updates);
    this.refreshCache();
    return this.getById(id);
  }

  toggleActive(id: string): DeviceResponseDto {
    const device = this.deviceRepo.findById(id);
    if (!device) throw new NotFoundError(`Thiết bị không tồn tại với ID ${id}`);

    const newActive = device.is_active === 1 ? false : true;
    this.deviceRepo.toggleActive(id, newActive);
    this.refreshCache();
    return this.getById(id);
  }

  exportToJson(): string {
    const devices = this.deviceRepo.findAll();
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      devices: devices.map((d) => ({
        ip_address: d.ip_address,
        name: d.name,
        description: d.description,
        is_active: d.is_active === 1,
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }

  importFromJson(jsonContent: string): { importedCount: number } {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || !Array.isArray(parsed.devices)) {
      throw new Error('Định dạng file JSON không hợp lệ: thiếu mảng "devices"');
    }

    const now = new Date().toISOString();
    const devicesToInsert: Device[] = parsed.devices.map((raw: unknown) => { const d = createDeviceSchema.parse(raw); return ({
      id: uuidv4(),
      ip_address: d.ip_address,
      name: d.name,
      description: d.description || null,
      is_active: d.is_active === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    }); });

    const count = this.deviceRepo.upsertBatch(devicesToInsert);
    this.refreshCache();
    return { importedCount: count };
  }

  private toResponseDto(device: Device): DeviceResponseDto {
    return {
      id: device.id,
      ip_address: device.ip_address,
      name: device.name,
      description: device.description || null,
      is_active: device.is_active === 1,
      created_at: device.created_at,
      updated_at: device.updated_at,
    };
  }
}

export const deviceService = new DeviceService();
