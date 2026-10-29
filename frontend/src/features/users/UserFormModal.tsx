import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { UserItem, UserFormData } from '../../types/user.types';
import { Shield, CheckSquare } from 'lucide-react';

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: UserItem | null;
  isLoading?: boolean;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    display_name: '',
    perm_add: false,
    perm_update: false,
    perm_delete: false,
    perm_restore: false,
    perm_manage_users: false,
    perm_view_audit_logs: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: initialData.username,
        password: '',
        display_name: initialData.display_name,
        perm_add: initialData.permissions.add,
        perm_update: initialData.permissions.update,
        perm_delete: initialData.permissions.delete,
        perm_restore: initialData.permissions.restore,
        perm_manage_users: initialData.permissions.manage_users,
        perm_view_audit_logs: initialData.permissions.view_audit_logs,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        display_name: '',
        perm_add: true,
        perm_update: true,
        perm_delete: false,
        perm_restore: false,
        perm_manage_users: false,
        perm_view_audit_logs: false,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectAllPermissions = () => {
    const allChecked =
      formData.perm_add &&
      formData.perm_update &&
      formData.perm_delete &&
      formData.perm_restore &&
      formData.perm_manage_users &&
      formData.perm_view_audit_logs;

    setFormData((prev) => ({
      ...prev,
      perm_add: !allChecked,
      perm_update: !allChecked,
      perm_delete: !allChecked,
      perm_restore: !allChecked,
      perm_manage_users: !allChecked,
      perm_view_audit_logs: !allChecked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) newErrors.username = 'Tên đăng nhập không được để trống';
    if (!initialData && (!formData.password || formData.password.length < 4)) {
      newErrors.password = 'Mật khẩu phải tối thiểu 4 ký tự';
    }
    if (!formData.display_name.trim()) newErrors.display_name = 'Tên hiển thị không được để trống';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Chỉnh sửa tài khoản: ${initialData.username}` : 'Thêm tài khoản mới'}
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          label="Tên đăng nhập *"
          name="username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
          disabled={!!initialData}
          placeholder="Ví dụ: nva_tablet01"
          required
        />

        <Input
          label={initialData ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu *'}
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder={initialData ? 'Nhập mật khẩu mới nếu muốn đổi' : 'Tối thiểu 4 ký tự'}
          required={!initialData}
        />

        <Input
          label="Tên hiển thị / Người phụ trách *"
          name="display_name"
          value={formData.display_name}
          onChange={handleChange}
          error={errors.display_name}
          placeholder="Ví dụ: Nguyễn Văn A (Tablet 1)"
          required
        />

        {/* 6 Functional Permissions Checkbox Group */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
              <Shield size={16} style={{ color: 'var(--primary)' }} />
              Phân quyền chức năng
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllPermissions}
              style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', minHeight: '28px' }}
            >
              <CheckSquare size={13} />
              Chọn tất cả (Admin)
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {[
              { name: 'perm_add', label: 'Thêm mẫu thử (add)' },
              { name: 'perm_update', label: 'Sửa mẫu thử (update)' },
              { name: 'perm_delete', label: 'Xóa mềm mẫu (delete)' },
              { name: 'perm_restore', label: 'Khôi phục mẫu (restore)' },
              { name: 'perm_manage_users', label: 'Quản lý tài khoản (users)' },
              { name: 'perm_view_audit_logs', label: 'Xem nhật ký (audit log)' },
            ].map((p) => (
              <label
                key={p.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  color: (formData as any)[p.name] ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <input
                  type="checkbox"
                  name={p.name}
                  checked={!!(formData as any)[p.name]}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {initialData ? 'Cập nhật' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
