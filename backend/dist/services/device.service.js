"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceService = exports.DeviceService = void 0;
const uuid_1 = require("uuid");
const device_repository_1 = require("../repositories/device.repository");
const DomainError_1 = require("../domain/errors/DomainError");
const device_validator_1 = require("../validators/device.validator");
class DeviceService {
    deviceRepo = new device_repository_1.DeviceRepository();
    ipCache = new Map();
    constructor() {
        this.refreshCache();
    }
    refreshCache() {
        try {
            const devices = this.deviceRepo.findAll();
            this.ipCache.clear();
            for (const d of devices) {
                if (d.is_active) {
                    this.ipCache.set(d.ip_address, d.name);
                }
            }
        }
        catch {
            // Table might not exist yet during migration
        }
    }
    resolveDeviceName(ip) {
        // Normalize localhost / IPv6 loopback
        const normalizedIp = ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '');
        const cachedName = this.ipCache.get(normalizedIp);
        if (cachedName)
            return cachedName;
        const device = this.deviceRepo.findByIp(normalizedIp);
        if (device && device.is_active) {
            this.ipCache.set(normalizedIp, device.name);
            return device.name;
        }
        return `Unknown (IP: ${normalizedIp})`;
    }
    getAll() {
        const devices = this.deviceRepo.findAll();
        return devices.map((d) => this.toResponseDto(d));
    }
    getById(id) {
        const device = this.deviceRepo.findById(id);
        if (!device)
            throw new DomainError_1.NotFoundError(`Thiết bị không tồn tại với ID ${id}`);
        return this.toResponseDto(device);
    }
    create(dto) {
        const existing = this.deviceRepo.findByIp(dto.ip_address);
        if (existing) {
            throw new DomainError_1.ConflictError(`Địa chỉ IP ${dto.ip_address} đã được đăng ký cho thiết bị ${existing.name}`);
        }
        const now = new Date().toISOString();
        const device = {
            id: (0, uuid_1.v4)(),
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
    update(id, dto) {
        const device = this.deviceRepo.findById(id);
        if (!device)
            throw new DomainError_1.NotFoundError(`Thiết bị không tồn tại với ID ${id}`);
        if (dto.ip_address && dto.ip_address !== device.ip_address) {
            const existing = this.deviceRepo.findByIp(dto.ip_address);
            if (existing && existing.id !== id) {
                throw new DomainError_1.ConflictError(`Địa chỉ IP ${dto.ip_address} đã được đăng ký cho thiết bị khác`);
            }
        }
        const updates = {
            updated_at: new Date().toISOString(),
        };
        if (dto.name !== undefined)
            updates.name = dto.name;
        if (dto.ip_address !== undefined)
            updates.ip_address = dto.ip_address;
        if (dto.description !== undefined)
            updates.description = dto.description;
        if (dto.is_active !== undefined)
            updates.is_active = dto.is_active ? 1 : 0;
        this.deviceRepo.update(id, updates);
        this.refreshCache();
        return this.getById(id);
    }
    toggleActive(id) {
        const device = this.deviceRepo.findById(id);
        if (!device)
            throw new DomainError_1.NotFoundError(`Thiết bị không tồn tại với ID ${id}`);
        const newActive = device.is_active === 1 ? false : true;
        this.deviceRepo.toggleActive(id, newActive);
        this.refreshCache();
        return this.getById(id);
    }
    exportToJson() {
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
    importFromJson(jsonContent) {
        const parsed = JSON.parse(jsonContent);
        if (!parsed || !Array.isArray(parsed.devices)) {
            throw new Error('Định dạng file JSON không hợp lệ: thiếu mảng "devices"');
        }
        const now = new Date().toISOString();
        const devicesToInsert = parsed.devices.map((raw) => {
            const d = device_validator_1.createDeviceSchema.parse(raw);
            return ({
                id: (0, uuid_1.v4)(),
                ip_address: d.ip_address,
                name: d.name,
                description: d.description || null,
                is_active: d.is_active === false ? 0 : 1,
                created_at: now,
                updated_at: now,
            });
        });
        const count = this.deviceRepo.upsertBatch(devicesToInsert);
        this.refreshCache();
        return { importedCount: count };
    }
    toResponseDto(device) {
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
exports.DeviceService = DeviceService;
exports.deviceService = new DeviceService();
