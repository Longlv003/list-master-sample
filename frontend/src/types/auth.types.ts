export interface UserPermissions {
  add: boolean;
  update: boolean;
  delete: boolean;
  restore: boolean;
  manage_users: boolean;
  view_audit_logs: boolean;
}

export interface AuthUser {
  must_change_password: boolean;
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
  permissions: UserPermissions;
}
