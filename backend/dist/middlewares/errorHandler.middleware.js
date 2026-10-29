"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const DomainError_1 = require("../domain/errors/DomainError");
const logger_1 = require("../infrastructure/logger/logger");
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    if (res.headersSent) {
        res.destroy(err);
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message, details: err.flatten() } });
        return;
    }
    if (['ENOENT', 'ENOTDIR'].includes(err.code || '')) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy file hoặc thư mục nguồn' } });
        return;
    }
    if (['EACCES', 'EPERM', 'ENETUNREACH', 'ETIMEDOUT', 'EIO'].includes(err.code || '')) {
        res.status(503).json({ success: false, error: { code: 'SOURCE_UNAVAILABLE', message: 'Không truy cập được nguồn dữ liệu' } });
        return;
    }
    if (err instanceof DomainError_1.DomainError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
        return;
    }
    logger_1.logger.error({ err }, 'Unhandled Internal Server Error');
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã xảy ra lỗi nội bộ trên máy chủ. Vui lòng liên hệ quản trị viên.',
        },
    });
}
