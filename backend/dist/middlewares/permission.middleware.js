"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const audit_service_1 = require("../services/audit.service");
function requirePermission(permission) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Vui lòng đăng nhập để thực hiện chức năng này',
                },
            });
            return;
        }
        if (user.must_change_password) {
            res.status(403).json({ success: false, error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Vui lòng đổi mật khẩu trước khi sử dụng chức năng quản trị' } });
            return;
        }
        const hasPermission = user.is_admin || user.permissions[permission];
        if (!hasPermission) {
            // Log unauthorized attempt to audit log
            audit_service_1.auditService.log({
                action: 'permission.denied',
                actor_id: user.id,
                actor_name: user.display_name,
                ip: req.deviceInfo?.ip || '127.0.0.1',
                device_name: req.deviceInfo?.name || null,
                entity_type: 'api',
                entity_id: req.originalUrl,
                old_value: { required_permission: permission },
                result: 'failure',
                error: `User does not have permission: ${permission}`,
            });
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `Bạn không có quyền thực hiện chức năng này (${permission})`,
                },
            });
            return;
        }
        next();
    };
}
