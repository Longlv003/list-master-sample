import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

export function populateUserMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.session?.userId;
  if (!userId) {
    req.user = undefined;
    return next();
  }

  try {
    const user = userService.getById(userId);
    if (!user || !user.is_active) {
      req.session.destroy(() => {});
      req.user = undefined;
      return next();
    }
    req.user = user;
  } catch {
    req.user = undefined;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để thực hiện chức năng này',
      },
    });
    return;
  }
  next();
}

