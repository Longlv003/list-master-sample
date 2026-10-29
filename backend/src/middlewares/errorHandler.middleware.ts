import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../domain/errors/DomainError';
import { logger } from '../infrastructure/logger/logger';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) { res.destroy(err); return; }
  if (err instanceof ZodError) { res.status(400).json({success: false, error: {code: 'VALIDATION_ERROR', message: err.issues[0]?.message, details: err.flatten()}}); return; }
  if (['ENOENT','ENOTDIR'].includes((err as NodeJS.ErrnoException).code || '')) { res.status(404).json({success: false, error: {code: 'NOT_FOUND', message: 'Không tìm thấy file hoặc thư mục nguồn'}}); return; }
  if (['EACCES','EPERM','ENETUNREACH','ETIMEDOUT','EIO'].includes((err as NodeJS.ErrnoException).code || '')) { res.status(503).json({success: false, error: {code: 'SOURCE_UNAVAILABLE', message: 'Không truy cập được nguồn dữ liệu'}}); return; }
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: (err as any).details,
      },
    });
    return;
  }

  logger.error({ err }, 'Unhandled Internal Server Error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi nội bộ trên máy chủ. Vui lòng liên hệ quản trị viên.',
    },
  });
}
