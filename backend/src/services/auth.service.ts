import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { LoginDto, AuthMeResponseDto } from '../dtos/auth.dto';
import { UnauthorizedError } from '../domain/errors/DomainError';
import { userService } from './user.service';
import { auditService } from './audit.service';
import { getDatabase } from '../infrastructure/database/db';
import { ValidationError } from '../domain/errors/DomainError';

export class AuthService {
  private userRepo = new UserRepository();

  login(
    dto: LoginDto,
    meta: { ip: string; deviceName: string }
  ): AuthMeResponseDto['user'] {
    const user = this.userRepo.findByUsername(dto.username);

    if (!user || user.is_active === 0) {
      auditService.log({
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
      throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    const isMatch = bcrypt.compareSync(dto.password, user.password_hash);
    if (!isMatch) {
      auditService.log({
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
      throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    this.userRepo.updateLastLogin(user.id);

    auditService.log({
      action: 'auth.login',
      actor_id: user.id,
      actor_name: user.display_name,
      ip: meta.ip,
      device_name: meta.deviceName,
      entity_type: 'user',
      entity_id: user.id,
      result: 'success',
    });

    const userDto = userService.toResponseDto(user);
    return {
      id: userDto.id,
      must_change_password: userDto.must_change_password,
      username: userDto.username,
      display_name: userDto.display_name,
      is_admin: userDto.is_admin,
      permissions: userDto.permissions,
    };
  }

  logout(
    userId: string | undefined,
    userName: string | undefined,
    meta: { ip: string; deviceName: string }
  ): void {
    if (userId) {
      auditService.log({
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

  getMe(userId?: string): AuthMeResponseDto['user'] {
    if (!userId) return null;
    const user = this.userRepo.findById(userId);
    if (!user || user.is_active === 0) return null;

    const userDto = userService.toResponseDto(user);
    return {
      id: userDto.id,
      must_change_password: userDto.must_change_password,
      username: userDto.username,
      display_name: userDto.display_name,
      is_admin: userDto.is_admin,
      permissions: userDto.permissions,
    };
  }

  changePassword(id: string, current: string, replacement: string): void {
    const user = this.userRepo.findById(id);
    if (!user || !bcrypt.compareSync(current, user.password_hash)) throw new UnauthorizedError('Mật khẩu hiện tại không đúng');
    if (replacement.length < 8 || bcrypt.compareSync(replacement, user.password_hash)) throw new ValidationError('Mật khẩu mới phải khác mật khẩu cũ và có ít nhất 8 ký tự');
    getDatabase().transaction(() => {
      this.userRepo.update(id, {password_hash: bcrypt.hashSync(replacement, 10), must_change_password: 0, updated_at: new Date().toISOString()});
      getDatabase().prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userId')=?").run(id);
    })();
  }
}

export const authService = new AuthService();
