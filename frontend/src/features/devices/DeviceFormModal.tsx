import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DeviceItem, DeviceFormData } from '../../types/device.types';

export interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeviceFormData) => Promise<void>;
  initialData?: DeviceItem | null;
  isLoading?: boolean;
}

export const DeviceFormModal: React.FC<DeviceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<DeviceFormData>({
    ip_address: '',
    name: '',
    description: '',
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ip_address: initialData.ip_address,
        name: initialData.name,
        description: initialData.description || '',
        is_active: initialData.is_active,
      });
    } else {
      setFormData({
        ip_address: '',
        name: '',
        description: '',
        is_active: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!formData.ip_address.trim() || !ipv4Regex.test(formData.ip_address.trim())) {
      newErrors.ip_address = 'Địa chỉ IP không đúng định dạng IPv4 hợp lệ (vd: 192.168.1.101)';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Tên thiết bị không được để trống';
    }

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
      title={initialData ? `Chỉnh sửa thiết bị: ${initialData.name}` : 'Thêm thiết bị mới'}
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Địa chỉ IP (LAN) *"
          name="ip_address"
          value={formData.ip_address}
          onChange={handleChange}
          error={errors.ip_address}
          placeholder="Ví dụ: 192.168.1.101"
          required
        />

        <Input
          label="Tên thiết bị / Tablet *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Ví dụ: Tablet-01 (Khu vực A)"
          required
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Ghi chú vị trí / mô tả
          </label>
          <textarea
            name="description"
            rows={2}
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Ví dụ: Tablet gắn cố định tại phòng kiểm tra mẫu tầng 1"
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem',
              outline: 'none',
              fontSize: '0.95rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {initialData ? 'Cập nhật' : 'Thêm thiết bị'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
