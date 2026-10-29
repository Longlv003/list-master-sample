import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { UserPermissions } from '../types/auth.types';

export interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredPermission?: keyof UserPermissions;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { user, isInitialized, isLoading } = useAuthStore();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
        Đang xác thực thông tin...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.must_change_password && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;

  if (requiredPermission && !user.is_admin && !user.permissions[requiredPermission]) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>
          Từ chối truy cập (403 Forbidden)
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Tài khoản của bạn ({user.display_name}) không có quyền thực hiện chức năng này ({requiredPermission}).
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '0.6rem 1.25rem',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Quay lại danh sách mẫu thử
        </button>
      </div>
    );
  }

  return children;
};
