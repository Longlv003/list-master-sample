import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { User, isUserAdmin } from '../domain/entities/User';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto';
import { ConflictError, NotFoundError } from '../domain/errors/DomainError';
import { getDatabase } from '../infrastructure/database/db';

export class UserService {
  private userRepo = new UserRepository();

  toResponseDto(user: User): UserResponseDto {
    const isAdmin = isUserAdmin(user);
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

  getAll(): UserResponseDto[] {
    const users = this.userRepo.findAll();
    return users.map((u) => this.toResponseDto(u));
  }

  getById(id: string): UserResponseDto {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError(`Người dùng không tồn tại với ID ${id}`);
    return this.toResponseDto(user);
  }

  create(dto: CreateUserDto): UserResponseDto {
    const existing = this.userRepo.findByUsername(dto.username);
    if (existing) {
      throw new ConflictError(`Tên đăng nhập "${dto.username}" đã tồn tại`);
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(dto.password, salt);
    const now = new Date().toISOString();

    const user: User = {
      id: uuidv4(),
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

  update(id: string, dto: UpdateUserDto): UserResponseDto {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError(`Người dùng không tồn tại với ID ${id}`);

    const updates: Partial<User> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.display_name !== undefined) updates.display_name = dto.display_name;
    if (dto.password && dto.password.trim().length > 0) {
      const salt = bcrypt.genSaltSync(10);
      updates.password_hash = bcrypt.hashSync(dto.password, salt);
    }
    if (dto.perm_add !== undefined) updates.perm_add = dto.perm_add ? 1 : 0;
    if (dto.perm_update !== undefined) updates.perm_update = dto.perm_update ? 1 : 0;
    if (dto.perm_delete !== undefined) updates.perm_delete = dto.perm_delete ? 1 : 0;
    if (dto.perm_restore !== undefined) updates.perm_restore = dto.perm_restore ? 1 : 0;
    if (dto.perm_manage_users !== undefined) updates.perm_manage_users = dto.perm_manage_users ? 1 : 0;
    if (dto.perm_view_audit_logs !== undefined) updates.perm_view_audit_logs = dto.perm_view_audit_logs ? 1 : 0;

    if (updates.password_hash) updates.must_change_password = 0;
    getDatabase().transaction(() => {
      this.protectLastAdmin(user, {...user, ...updates});
      this.userRepo.update(id, updates);
      if (updates.password_hash) getDatabase().prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userId')=?").run(id);
    })();
    return this.getById(id);
  }

  toggleActive(id: string): UserResponseDto {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError(`Người dùng không tồn tại với ID ${id}`);

    const newActive = user.is_active === 1 ? false : true;
    getDatabase().transaction(() => {
      this.protectLastAdmin(user, {...user, is_active: newActive ? 1 : 0});
      this.userRepo.toggleActive(id, newActive);
    })();
    return this.getById(id);
  }

  private protectLastAdmin(before: User, after: User): void {
    if (before.is_active && isUserAdmin(before) && (!after.is_active || !isUserAdmin(after)) &&
        this.userRepo.findAll().filter(user => user.is_active && isUserAdmin(user)).length <= 1) {
      throw new ConflictError('Phải giữ ít nhất một quản trị viên đang hoạt động');
    }
  }
}

export const userService = new UserService();
