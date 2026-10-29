"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migration_runner_1 = require("../infrastructure/database/migration.runner");
const user_repository_1 = require("../repositories/user.repository");
const user_service_1 = require("../services/user.service");
const logger_1 = require("../infrastructure/logger/logger");
const db_1 = require("../infrastructure/database/db");
const db_2 = require("../infrastructure/database/db");
const crypto_1 = __importDefault(require("crypto"));
async function main() {
    logger_1.logger.info('Running init-admin script...');
    (0, migration_runner_1.runMigrations)();
    const userRepo = new user_repository_1.UserRepository();
    const existing = userRepo.findByUsername('admin');
    if (existing) {
        logger_1.logger.info('Admin user already exists. Resetting permissions to full admin...');
        user_service_1.userService.update(existing.id, {
            perm_add: true,
            perm_update: true,
            perm_delete: true,
            perm_restore: true,
            perm_manage_users: true,
            perm_view_audit_logs: true,
        });
        logger_1.logger.info('Admin permissions updated.');
    }
    else {
        logger_1.logger.info('Creating new admin user...');
        const initialPassword = crypto_1.default.randomBytes(12).toString('base64url');
        const created = user_service_1.userService.create({
            username: 'admin',
            password: initialPassword,
            display_name: 'Quản trị viên',
            perm_add: true,
            perm_update: true,
            perm_delete: true,
            perm_restore: true,
            perm_manage_users: true,
            perm_view_audit_logs: true,
        });
        (0, db_2.getDatabase)().prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(created.id);
        console.log(`Tài khoản admin. Mật khẩu tạm: ${initialPassword}. Cần đổi sau khi đăng nhập.`);
    }
    (0, db_1.closeDatabase)();
    process.exit(0);
}
main().catch((err) => {
    logger_1.logger.error({ err }, 'Error in init-admin');
    process.exit(1);
});
