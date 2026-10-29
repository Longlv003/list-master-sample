import { runMigrations } from '../infrastructure/database/migration.runner';
import { UserRepository } from '../repositories/user.repository';
import { userService } from '../services/user.service';
import { logger } from '../infrastructure/logger/logger';
import { closeDatabase } from '../infrastructure/database/db';
import { getDatabase } from '../infrastructure/database/db';
import crypto from 'crypto';

async function main() {
  logger.info('Running init-admin script...');
  runMigrations();

  const userRepo = new UserRepository();
  const existing = userRepo.findByUsername('admin');

  if (existing) {
    logger.info('Admin user already exists. Resetting permissions to full admin...');
    userService.update(existing.id, {
      perm_add: true,
      perm_update: true,
      perm_delete: true,
      perm_restore: true,
      perm_manage_users: true,
      perm_view_audit_logs: true,
    });
    logger.info('Admin permissions updated.');
  } else {
    logger.info('Creating new admin user...');
    const initialPassword = crypto.randomBytes(12).toString('base64url');
    const created = userService.create({
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
    getDatabase().prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(created.id);
    console.log(`Tài khoản admin. Mật khẩu tạm: ${initialPassword}. Cần đổi sau khi đăng nhập.`);
  }

  closeDatabase();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Error in init-admin');
  process.exit(1);
});
