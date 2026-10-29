import { Request, Response, NextFunction } from 'express';
import { deviceService } from '../services/device.service';
import { auditService } from '../services/audit.service';

export class DeviceController {
  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const devices = deviceService.getAll();
      res.status(200).json({
        success: true,
        data: { items: devices },
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const device = deviceService.create(req.body);

      auditService.log({
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
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const device = deviceService.update(req.params.id, req.body);

      auditService.log({
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
    } catch (err) {
      next(err);
    }
  };

  toggleActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const device = deviceService.toggleActive(req.params.id);

      auditService.log({
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
    } catch (err) {
      next(err);
    }
  };

  exportJson = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const json = deviceService.exportToJson();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="devices.json"');
      res.send(json);
    } catch (err) {
      next(err);
    }
  };

  importJson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jsonContent = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const result = deviceService.importFromJson(jsonContent);

      auditService.log({
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
    } catch (err) {
      next(err);
    }
  };
}

export const deviceController = new DeviceController();
