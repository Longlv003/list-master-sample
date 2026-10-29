"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const config_1 = require("../config/config");
const zod_1 = require("zod");
const audit_service_1 = require("../services/audit.service");
class AuthController {
    login = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
            };
            const user = auth_service_1.authService.login(req.body, meta);
            if (user) {
                await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
                req.session.userId = user.id;
                req.session.username = user.username;
                await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
            }
            res.status(200).json({
                success: true,
                data: { user },
            });
        }
        catch (err) {
            next(err);
        }
    };
    logout = async (req, res, next) => {
        try {
            const meta = {
                ip: req.deviceInfo?.ip || '127.0.0.1',
                deviceName: req.deviceInfo?.name || 'Unknown',
            };
            auth_service_1.authService.logout(req.user?.id, req.user?.display_name, meta);
            req.session.destroy((err) => {
                if (err)
                    return next(err);
                res.clearCookie(config_1.config.session.cookieName);
                res.status(200).json({
                    success: true,
                    data: { message: 'Đăng xuất thành công' },
                });
            });
        }
        catch (err) {
            next(err);
        }
    };
    me = async (req, res, next) => {
        try {
            const user = auth_service_1.authService.getMe(req.session?.userId);
            res.status(200).json({
                success: true,
                data: { user },
            });
        }
        catch (err) {
            next(err);
        }
    };
    changePassword = async (req, res, next) => {
        try {
            const body = zod_1.z.object({ currentPassword: zod_1.z.string().min(1), newPassword: zod_1.z.string().min(8).max(200) }).parse(req.body);
            auth_service_1.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
            audit_service_1.auditService.log({ action: 'auth.password_changed', actor_id: req.user.id, actor_name: req.user.display_name,
                ip: req.deviceInfo?.ip || req.ip || '', device_name: req.deviceInfo?.name, entity_type: 'user', entity_id: req.user.id, result: 'success' });
            await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
            req.session.userId = req.user.id;
            await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
            res.json({ success: true, data: { user: auth_service_1.authService.getMe(req.user.id) } });
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
