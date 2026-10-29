import { useCachedQuery } from "../../hooks/useCachedQuery";
import React, { useState } from 'react';
import { userApi } from '../../services/user.service';
import { UserItem, UserFormData } from '../../types/user.types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserFormModal } from './UserFormModal';
import { useToastStore } from '../../store/toast.store';
import { Plus, Edit2, Power, ShieldCheck, UserCheck } from 'lucide-react';

export const UserListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const { addToast } = useToastStore();

  const { data, isLoading, refresh: fetchUsers } = useCachedQuery(
    'users', () => userApi.getAll(),
    (error) => addToast({ type: 'error', title: 'Lỗi tải người dùng', message: error.message }),
  );
  const users = data?.items ?? [];

  const handleSubmit = async (formData: UserFormData) => {
    try {
      if (editingUser) {
        await userApi.update(editingUser.id, formData);
        addToast({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật tài khoản "${formData.username}"`,
        });
      } else {
        await userApi.create(formData);
        addToast({
          type: 'success',
          title: 'Thành công',
          message: `Đã tạo tài khoản "${formData.username}"`,
        });
      }
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi lưu tài khoản',
        message: err.message || 'Không thể lưu người dùng',
      });
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      await userApi.toggleActive(user.id);
      addToast({
        type: 'info',
        title: 'Cập nhật',
        message: `Đã ${user.is_active ? 'vô hiệu hóa' : 'kích hoạt'} tài khoản "${user.username}"`,
      });
      fetchUsers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể thay đổi trạng thái',
      });
    }
  };

  return (
    <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Quản lý Tài khoản & Phân quyền
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Phân quyền 6 chức năng (Thêm, Sửa, Xóa, Khôi phục, Quản lý tài khoản, Xem Audit Log)
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
        >
          Thêm tài khoản
        </Button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '0.85rem 1rem' }}>Tên đăng nhập</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tên hiển thị</th>
                <th style={{ padding: '0.85rem 1rem' }}>Vai trò</th>
                <th style={{ padding: '0.85rem 1rem' }}>Các quyền đã cấp</th>
                <th style={{ padding: '0.85rem 1rem' }}>Trạng thái</th>
                <th style={{ padding: '0.85rem 1rem' }}>Đăng nhập gần nhất</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Chưa có tài khoản nào.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {user.username}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {user.display_name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {user.is_admin ? (
                        <span style={{ color: '#a855f7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={16} /> Admin (Toàn quyền)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={16} /> Nhân viên
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {user.permissions.add && <Badge variant="info">Thêm</Badge>}
                        {user.permissions.update && <Badge variant="info">Sửa</Badge>}
                        {user.permissions.delete && <Badge variant="danger">Xóa</Badge>}
                        {user.permissions.restore && <Badge variant="success">Khôi phục</Badge>}
                        {user.permissions.manage_users && <Badge variant="warning">Users</Badge>}
                        {user.permissions.view_audit_logs && <Badge variant="neutral">Audit</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Badge status={user.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setIsModalOpen(true);
                          }}
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                          }}
                          title="Sửa quyền / Mật khẩu"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: user.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: user.is_active ? 'var(--danger)' : 'var(--success)',
                            display: 'flex',
                          }}
                          title={user.is_active ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt lại'}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingUser}
      />
    </div>
  );
};
