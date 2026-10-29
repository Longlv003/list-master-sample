"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceController = exports.DeviceController = void 0;
const device_service_1 = require("../services/device.service");
const audit_service_1 = require("../services/audit.service");
class DeviceController {
    getAll = async (_req, res, next) => {
        try {
            const devices = device_service_1.deviceService.getAll();
            res.status(200).json({
                success: true,
                data: { items: devices },
            });
        }
        catch (err) {
            next(err);
        }
    };
    create = async (req, res, next) => {
        try {
            const device = device_service_1.deviceService.create(req.body);
            audit_service_1.auditService.log({
                action: 'device.create',
                actor_id: req.user?.id || null,
                actor_name: req.user?.display_name || null,
                ip: req.deviceInfo?.ip || '127.0.0.1',
                device_name: req.deviceInfo?.name || 'Unknown',
                entity_type: 'device',
                entity_id: device.id,
                new_value: { ip_address: device.ip_address, name: device.name },
                result: 'success',
            });
            res.status(201).json({
                success: true,
                data: device,
            });
        }
        catch (err) {
            next(err);
        }
    };
    update = async (req, res, next) => {
        try {
            const device = device_service_1.deviceService.update(req.params.id, req.body);
            audit_service_1.auditService.log({
                action: 'device.update',
                actor_id: req.user?.id || null,
                actor_name: req.user?.display_name || null,
                ip: req.deviceInfo?.ip || '127.0.0.1',
                device_name: req.deviceInfo?.name || 'Unknown',
                entity_type: 'device',
                entity_id: device.id,
                new_value: { ip_address: device.ip_address, name: device.name },
                result: 'success',
            });
            res.status(200).json({
                success: true,
                data: device,
            });
        }
        catch (err) {
            next(err);
        }
    };
    toggleActive = async (req, res, next) => {
        try {
            const device = device_service_1.deviceService.toggleActive(req.params.id);
            audit_service_1.auditService.log({
                action: 'device.toggle_active',
                actor_id: req.user?.id || null,
                actor_name: req.user?.display_name || null,
                ip: req.deviceInfo?.ip || '127.0.0.1',
                device_name: req.deviceInfo?.name || 'Unknown',
                entity_type: 'device',
                entity_id: device.id,
                new_value: { is_active: device.is_active },
                result: 'success',
            });
            res.status(200).json({
                success: true,
                data: device,
            });
        }
        catch (err) {
            next(err);
        }
    };
    exportJson = async (_req, res, next) => {
        try {
            const json = device_service_1.deviceService.exportToJson();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="devices.json"');
            res.send(json);
        }
        catch (err) {
            next(err);
        }
    };
    importJson = async (req, res, next) => {
        try {
            const jsonContent = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            const result = device_service_1.deviceService.importFromJson(jsonContent);
            audit_service_1.auditService.log({
                action: 'device.import',
                actor_id: req.user?.id || null,
                actor_name: req.user?.display_name || null,
                ip: req.deviceInfo?.ip || '127.0.0.1',
                device_name: req.deviceInfo?.name || 'Unknown',
                entity_type: 'device',
                new_value: result,
                result: 'success',
            });
            res.status(200).json({
                success: true,
                data: { message: `Đã import thành công ${result.importedCount} thiết bị`, count: result.importedCount },
            });
        }
        catch (err) {
            next(err);
        }
    };
}
exports.DeviceController = DeviceController;
exports.deviceController = new DeviceController();
