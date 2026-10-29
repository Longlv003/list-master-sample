import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { auditService } from '../services/audit.service';

export class UserController {
  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = userService.getAll();
      res.status(200).json({
        success: true,
        data: { items: users },
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = userService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = userService.create(req.body);

      auditService.log({
        action: 'user.create',
        actor_id: req.user?.id || null,
        actor_name: req.user?.display_name || null,
        ip: req.deviceInfo?.ip || '127.0.0.1',
        device_name: req.deviceInfo?.name || 'Unknown',
        entity_type: 'user',
        entity_id: user.id,
        new_value: { username: user.username, display_name: user.display_name },
        result: 'success',
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = userService.update(req.params.id, req.body);

      auditService.log({
        action: 'user.update',
        actor_id: req.user?.id || null,
        actor_name: req.user?.display_name || null,
        ip: req.deviceInfo?.ip || '127.0.0.1',
        device_name: req.deviceInfo?.name || 'Unknown',
        entity_type: 'user',
        entity_id: user.id,
        new_value: { display_name: user.display_name },
        result: 'success',
      });

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  };

  toggleActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = userService.toggleActive(req.params.id);

      auditService.log({
        action: 'user.toggle_active',
        actor_id: req.user?.id || null,
        actor_name: req.user?.display_name || null,
        ip: req.deviceInfo?.ip || '127.0.0.1',
        device_name: req.deviceInfo?.name || 'Unknown',
        entity_type: 'user',
        entity_id: user.id,
        new_value: { is_active: user.is_active },
        result: 'success',
      });

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController();
