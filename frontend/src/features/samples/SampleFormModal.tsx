import { localDate } from '../../utils/date';
import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Sample, SampleFormData } from '../../types/sample.types';

export interface SampleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SampleFormData) => Promise<void>;
  initialData?: Sample | null;
  isLoading?: boolean;
}

export const SampleFormModal: React.FC<SampleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<SampleFormData>({
    no: null,
    sample_code: '',
    quantity: 1,
    item_code: '',
    layer: '',
    program_name: '',
    made_date: '',
    expiry_date: '',
    comment: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        no: initialData.no,
        sample_code: initialData.sample_code,
        quantity: initialData.quantity,
        item_code: initialData.item_code || '',
        layer: initialData.layer || '',
        program_name: initialData.program_name || '',
        made_date: initialData.made_date || '',
        expiry_date: initialData.expiry_date || '',
        comment: initialData.comment || '',
      });
    } else {
      setFormData({
        no: null,
        sample_code: '',
        quantity: 1,
        item_code: '',
        layer: '',
        program_name: '',
        made_date: localDate(new Date()),
        expiry_date: '',
        comment: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'no' ? (value ? Number(value) : null) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.sample_code || !formData.sample_code.trim()) {
      newErrors.sample_code = 'Mã mẫu thử không được để trống';
    }
    if (formData.quantity < 1) {
      newErrors.quantity = 'Số lượng tối thiểu là 1';
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
      title={initialData ? `Chỉnh sửa mẫu thử: ${initialData.sample_code}` : 'Thêm mẫu thử mới'}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <Input
            label="Mã mẫu thử *"
            name="sample_code"
            value={formData.sample_code}
            onChange={handleChange}
            error={errors.sample_code}
            placeholder="Ví dụ: SAM-2026-001"
            required
          />

          <Input
            label="Số lượng *"
            name="quantity"
            type="number"
            min={1}
            value={formData.quantity || 1}
            onChange={handleChange}
            error={errors.quantity}
            required
          />

          <Input
            label="STT hiển thị"
            name="no"
            type="number"
            value={formData.no ?? ''}
            onChange={handleChange}
            placeholder="Tự động tính nếu để trống"
          />

          <Input
            label="Item Code"
            name="item_code"
            value={formData.item_code || ''}
            onChange={handleChange}
            placeholder="Ví dụ: ITEM-A1"
          />

          <Input
            label="Layer"
            name="layer"
            value={formData.layer || ''}
            onChange={handleChange}
            placeholder="Ví dụ: Top, Bottom"
          />

          <Input
            label="Tên chương trình"
            name="program_name"
            value={formData.program_name || ''}
            onChange={handleChange}
            placeholder="Ví dụ: Test Run #1"
          />

          <Input
            label="Ngày làm mẫu"
            name="made_date"
            type="date"
            value={formData.made_date || ''}
            onChange={handleChange}
          />

          <Input
            label="Ngày hết hạn sử dụng"
            name="expiry_date"
            type="date"
            value={formData.expiry_date || ''}
            onChange={handleChange}
            helperText="Hệ thống sẽ tự cảnh báo trước ngày này"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Ghi chú (Comment)
          </label>
          <textarea
            name="comment"
            rows={3}
            value={formData.comment || ''}
            onChange={handleChange}
            placeholder="Ghi chú thêm về điều kiện lưu trữ, vị trí kệ, người phụ trách..."
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
            {initialData ? 'Lưu thay đổi' : 'Thêm mẫu thử'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
