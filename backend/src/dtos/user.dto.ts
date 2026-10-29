export interface CreateUserDto {
  username: string;
  password: string;
  display_name: string;
  perm_add?: boolean;
  perm_update?: boolean;
  perm_delete?: boolean;
  perm_restore?: boolean;
  perm_manage_users?: boolean;
  perm_view_audit_logs?: boolean;
}

export interface UpdateUserDto {
  password?: string;
  display_name?: string;
  perm_add?: boolean;
  perm_update?: boolean;
  perm_delete?: boolean;
  perm_restore?: boolean;
  perm_manage_users?: boolean;
  perm_view_audit_logs?: boolean;
}

export interface UserResponseDto {
  must_change_password: boolean;
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
  permissions: {
    add: boolean;
    update: boolean;
    delete: boolean;
    restore: boolean;
    manage_users: boolean;
    view_audit_logs: boolean;
  };
  perm_add: number;
  perm_update: number;
  perm_delete: number;
  perm_restore: number;
  perm_manage_users: number;
  perm_view_audit_logs: number;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}
