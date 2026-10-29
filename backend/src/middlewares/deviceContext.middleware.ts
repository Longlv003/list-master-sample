import { Request, Response, NextFunction } from 'express';
import { deviceService } from '../services/device.service';

export function deviceContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Extract real client IP behind proxy or LAN
  // Express consults X-Forwarded-For only for explicitly trusted proxies.
  let ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  // Normalize IPv6 prefix
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  } else if (ip.startsWith('::ffff:')) {
    ip = ip.replace(/^::ffff:/, '');
  }

  const name = deviceService.resolveDeviceName(ip);

  req.deviceInfo = {
    ip,
    name,
  };

  next();
}
