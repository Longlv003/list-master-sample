import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { config } from '../config/config';
import { z } from 'zod';
import { auditService } from '../services/audit.service';

export class AuthController {
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
      };

      const user = authService.login(req.body, meta);

      if (user) {
        await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
        req.session.userId = user.id;
        req.session.username = user.username;
        await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = {
        ip: req.deviceInfo?.ip || '127.0.0.1',
        deviceName: req.deviceInfo?.name || 'Unknown',
      };

      authService.logout(req.user?.id, req.user?.display_name, meta);

      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie(config.session.cookieName);
        res.status(200).json({
          success: true,
          data: { message: 'Đăng xuất thành công' },
        });
      });
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = authService.getMe(req.session?.userId);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = z.object({currentPassword: z.string().min(1), newPassword: z.string().min(8).max(200)}).parse(req.body);
      authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
      auditService.log({action: 'auth.password_changed', actor_id: req.user!.id, actor_name: req.user!.display_name,
        ip: req.deviceInfo?.ip || req.ip || '', device_name: req.deviceInfo?.name, entity_type: 'user', entity_id: req.user!.id, result: 'success'});
      await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
      req.session.userId = req.user!.id;
      await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
      res.json({success: true, data: {user: authService.getMe(req.user!.id)}});
    } catch (err) { next(err); }
  };
}

export const authController = new AuthController();
