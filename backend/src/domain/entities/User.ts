export interface User {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  is_active: number; // 1 or 0
  perm_add: number;
  perm_update: number;
  perm_delete: number;
  perm_restore: number;
  perm_manage_users: number;
  perm_view_audit_logs: number;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  must_change_password?: number;
}

export function isUserAdmin(user: {
  perm_add: number;
  perm_update: number;
  perm_delete: number;
  perm_restore: number;
  perm_manage_users: number;
  perm_view_audit_logs: number;
}): boolean {
  return (
    user.perm_add === 1 &&
    user.perm_update === 1 &&
    user.perm_delete === 1 &&
    user.perm_restore === 1 &&
    user.perm_manage_users === 1 &&
    user.perm_view_audit_logs === 1
  );
}
