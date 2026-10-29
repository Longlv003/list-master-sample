"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
const audit_service_1 = require("../services/audit.service");
class UserController {
    getAll = async (_req, res, next) => {
        try {
            const users = user_service_1.userService.getAll();
            res.status(200).json({
                success: true,
                data: { items: users },
            });
        }
        catch (err) {
            next(err);
        }
    };
    getById = async (req, res, next) => {
        try {
            const user = user_service_1.userService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (err) {
            next(err);
        }
    };
    create = async (req, res, next) => {
        try {
            const user = user_service_1.userService.create(req.body);
            audit_service_1.auditService.log({
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
        }
        catch (err) {
            next(err);
        }
    };
    update = async (req, res, next) => {
        try {
            const user = user_service_1.userService.update(req.params.id, req.body);
            audit_service_1.auditService.log({
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
        }
        catch (err) {
            next(err);
        }
    };
    toggleActive = async (req, res, next) => {
        try {
            const user = user_service_1.userService.toggleActive(req.params.id);
            audit_service_1.auditService.log({
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
        }
        catch (err) {
            next(err);
        }
    };
}
exports.UserController = UserController;
exports.userController = new UserController();
