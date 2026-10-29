export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthMeResponseDto {
  user: {
    must_change_password: boolean;
    id: string;
    username: string;
    display_name: string;
    is_admin: boolean;
    permissions: {
      add: boolean;
      update: boolean;
      delete: boolean;
      restore: boolean;
      manage_users: boolean;
      view_audit_logs: boolean;
    };
  } | null;
}
