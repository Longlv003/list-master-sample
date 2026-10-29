import { UserPermissions } from './auth.types';

export interface UserItem {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
  permissions: UserPermissions;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface UserFormData {
  username: string;
  password?: string;
  display_name: string;
  perm_add: boolean;
  perm_update: boolean;
  perm_delete: boolean;
  perm_restore: boolean;
  perm_manage_users: boolean;
  perm_view_audit_logs: boolean;
}
