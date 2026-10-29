"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_repository_1 = require("../repositories/user.repository");
const DomainError_1 = require("../domain/errors/DomainError");
const user_service_1 = require("./user.service");
const audit_service_1 = require("./audit.service");
const db_1 = require("../infrastructure/database/db");
const DomainError_2 = require("../domain/errors/DomainError");
class AuthService {
    userRepo = new user_repository_1.UserRepository();
    login(dto, meta) {
        const user = this.userRepo.findByUsername(dto.username);
        if (!user || user.is_active === 0) {
            audit_service_1.auditService.log({
                action: 'auth.login_failed',
                actor_id: null,
                actor_name: dto.username,
                ip: meta.ip,
                device_name: meta.deviceName,
                entity_type: 'user',
                entity_id: user ? user.id : null,
                result: 'failure',
                error: !user ? 'User not found' : 'Account deactivated',
            });
            throw new DomainError_1.UnauthorizedError('Tên đăng nhập hoặc mật khẩu không chính xác');
        }
        const isMatch = bcryptjs_1.default.compareSync(dto.password, user.password_hash);
        if (!isMatch) {
            audit_service_1.auditService.log({
                action: 'auth.login_failed',
                actor_id: user.id,
                actor_name: user.display_name,
                ip: meta.ip,
                device_name: meta.deviceName,
                entity_type: 'user',
                entity_id: user.id,
                result: 'failure',
                error: 'Invalid password',
            });
            throw new DomainError_1.UnauthorizedError('Tên đăng nhập hoặc mật khẩu không chính xác');
        }
        this.userRepo.updateLastLogin(user.id);
        audit_service_1.auditService.log({
            action: 'auth.login',
            actor_id: user.id,
            actor_name: user.display_name,
            ip: meta.ip,
            device_name: meta.deviceName,
            entity_type: 'user',
            entity_id: user.id,
            result: 'success',
        });
        const userDto = user_service_1.userService.toResponseDto(user);
        return {
            id: userDto.id,
            must_change_password: userDto.must_change_password,
            username: userDto.username,
            display_name: userDto.display_name,
            is_admin: userDto.is_admin,
            permissions: userDto.permissions,
        };
    }
    logout(userId, userName, meta) {
        if (userId) {
            audit_service_1.auditService.log({
                action: 'auth.logout',
                actor_id: userId,
                actor_name: userName || null,
                ip: meta.ip,
                device_name: meta.deviceName,
                entity_type: 'user',
                entity_id: userId,
                result: 'success',
            });
        }
    }
    getMe(userId) {
        if (!userId)
            return null;
        const user = this.userRepo.findById(userId);
        if (!user || user.is_active === 0)
            return null;
        const userDto = user_service_1.userService.toResponseDto(user);
        return {
            id: userDto.id,
            must_change_password: userDto.must_change_password,
            username: userDto.username,
            display_name: userDto.display_name,
            is_admin: userDto.is_admin,
            permissions: userDto.permissions,
        };
    }
    changePassword(id, current, replacement) {
        const user = this.userRepo.findById(id);
        if (!user || !bcryptjs_1.default.compareSync(current, user.password_hash))
            throw new DomainError_1.UnauthorizedError('Mật khẩu hiện tại không đúng');
        if (replacement.length < 8 || bcryptjs_1.default.compareSync(replacement, user.password_hash))
            throw new DomainError_2.ValidationError('Mật khẩu mới phải khác mật khẩu cũ và có ít nhất 8 ký tự');
        (0, db_1.getDatabase)().transaction(() => {
            this.userRepo.update(id, { password_hash: bcryptjs_1.default.hashSync(replacement, 10), must_change_password: 0, updated_at: new Date().toISOString() });
            (0, db_1.getDatabase)().prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userId')=?").run(id);
        })();
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
