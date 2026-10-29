"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const user_repository_1 = require("../repositories/user.repository");
const User_1 = require("../domain/entities/User");
const DomainError_1 = require("../domain/errors/DomainError");
const db_1 = require("../infrastructure/database/db");
class UserService {
    userRepo = new user_repository_1.UserRepository();
    toResponseDto(user) {
        const isAdmin = (0, User_1.isUserAdmin)(user);
        return {
            must_change_password: user.must_change_password === 1,
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            is_active: user.is_active === 1,
            is_admin: isAdmin,
            permissions: {
                add: user.perm_add === 1,
                update: user.perm_update === 1,
                delete: user.perm_delete === 1,
                restore: user.perm_restore === 1,
                manage_users: user.perm_manage_users === 1,
                view_audit_logs: user.perm_view_audit_logs === 1,
            },
            perm_add: user.perm_add,
            perm_update: user.perm_update,
            perm_delete: user.perm_delete,
            perm_restore: user.perm_restore,
            perm_manage_users: user.perm_manage_users,
            perm_view_audit_logs: user.perm_view_audit_logs,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login_at: user.last_login_at,
        };
    }
    getAll() {
        const users = this.userRepo.findAll();
        return users.map((u) => this.toResponseDto(u));
    }
    getById(id) {
        const user = this.userRepo.findById(id);
        if (!user)
            throw new DomainError_1.NotFoundError(`Người dùng không tồn tại với ID ${id}`);
        return this.toResponseDto(user);
    }
    create(dto) {
        const existing = this.userRepo.findByUsername(dto.username);
        if (existing) {
            throw new DomainError_1.ConflictError(`Tên đăng nhập "${dto.username}" đã tồn tại`);
        }
        const salt = bcryptjs_1.default.genSaltSync(10);
        const password_hash = bcryptjs_1.default.hashSync(dto.password, salt);
        const now = new Date().toISOString();
        const user = {
            id: (0, uuid_1.v4)(),
            username: dto.username,
            password_hash,
            display_name: dto.display_name,
            is_active: 1,
            perm_add: dto.perm_add ? 1 : 0,
            perm_update: dto.perm_update ? 1 : 0,
            perm_delete: dto.perm_delete ? 1 : 0,
            perm_restore: dto.perm_restore ? 1 : 0,
            perm_manage_users: dto.perm_manage_users ? 1 : 0,
            perm_view_audit_logs: dto.perm_view_audit_logs ? 1 : 0,
            created_at: now,
            updated_at: now,
            last_login_at: null,
        };
        this.userRepo.insert(user);
        return this.toResponseDto(user);
    }
    update(id, dto) {
        const user = this.userRepo.findById(id);
        if (!user)
            throw new DomainError_1.NotFoundError(`Người dùng không tồn tại với ID ${id}`);
        const updates = {
            updated_at: new Date().toISOString(),
        };
        if (dto.display_name !== undefined)
            updates.display_name = dto.display_name;
        if (dto.password && dto.password.trim().length > 0) {
            const salt = bcryptjs_1.default.genSaltSync(10);
            updates.password_hash = bcryptjs_1.default.hashSync(dto.password, salt);
        }
        if (dto.perm_add !== undefined)
            updates.perm_add = dto.perm_add ? 1 : 0;
        if (dto.perm_update !== undefined)
            updates.perm_update = dto.perm_update ? 1 : 0;
        if (dto.perm_delete !== undefined)
            updates.perm_delete = dto.perm_delete ? 1 : 0;
        if (dto.perm_restore !== undefined)
            updates.perm_restore = dto.perm_restore ? 1 : 0;
        if (dto.perm_manage_users !== undefined)
            updates.perm_manage_users = dto.perm_manage_users ? 1 : 0;
        if (dto.perm_view_audit_logs !== undefined)
            updates.perm_view_audit_logs = dto.perm_view_audit_logs ? 1 : 0;
        if (updates.password_hash)
            updates.must_change_password = 0;
        (0, db_1.getDatabase)().transaction(() => {
            this.protectLastAdmin(user, { ...user, ...updates });
            this.userRepo.update(id, updates);
            if (updates.password_hash)
                (0, db_1.getDatabase)().prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userId')=?").run(id);
        })();
        return this.getById(id);
    }
    toggleActive(id) {
        const user = this.userRepo.findById(id);
        if (!user)
            throw new DomainError_1.NotFoundError(`Người dùng không tồn tại với ID ${id}`);
        const newActive = user.is_active === 1 ? false : true;
        (0, db_1.getDatabase)().transaction(() => {
            this.protectLastAdmin(user, { ...user, is_active: newActive ? 1 : 0 });
            this.userRepo.toggleActive(id, newActive);
        })();
        return this.getById(id);
    }
    protectLastAdmin(before, after) {
        if (before.is_active && (0, User_1.isUserAdmin)(before) && (!after.is_active || !(0, User_1.isUserAdmin)(after)) &&
            this.userRepo.findAll().filter(user => user.is_active && (0, User_1.isUserAdmin)(user)).length <= 1) {
            throw new DomainError_1.ConflictError('Phải giữ ít nhất một quản trị viên đang hoạt động');
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
