"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
const zod_1 = require("zod");
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const issues = err.issues.map((i) => ({
                    field: i.path.join('.'),
                    message: i.message,
                }));
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: issues[0]?.message || 'Dữ liệu đầu vào không hợp lệ',
                        details: issues,
                    },
                });
                return;
            }
            next(err);
        }
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const issues = err.issues.map((i) => ({
                    field: i.path.join('.'),
                    message: i.message,
                }));
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: issues[0]?.message || 'Tham số truy vấn không hợp lệ',
                        details: issues,
                    },
                });
                return;
            }
            next(err);
        }
    };
}
