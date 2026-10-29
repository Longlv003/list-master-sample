import { useCachedQuery } from "../../hooks/useCachedQuery";
import React, { useState } from 'react';
import { deviceApi } from '../../services/device.service';
import { DeviceItem, DeviceFormData } from '../../types/device.types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DeviceFormModal } from './DeviceFormModal';
import { useToastStore } from '../../store/toast.store';
import { Plus, Edit2, Power, Download, Upload, Tablet } from 'lucide-react';

export const DeviceListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const { addToast } = useToastStore();

  const { data, isLoading, refresh: fetchDevices } = useCachedQuery(
    'devices', () => deviceApi.getAll(),
    (error) => addToast({ type: 'error', title: 'Lỗi tải thiết bị', message: error.message }),
  );
  const devices = data?.items ?? [];

  const handleSubmit = async (formData: DeviceFormData) => {
    try {
      if (editingDevice) {
        await deviceApi.update(editingDevice.id, formData);
        addToast({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật thiết bị "${formData.name}"`,
        });
      } else {
        await deviceApi.create(formData);
        addToast({
          type: 'success',
          title: 'Thành công',
          message: `Đã thêm thiết bị "${formData.name}"`,
        });
      }
      setIsModalOpen(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi lưu thiết bị',
        message: err.message || 'Không thể lưu thiết bị',
      });
    }
  };

  const handleToggleActive = async (device: DeviceItem) => {
    try {
      await deviceApi.toggleActive(device.id);
      addToast({
        type: 'info',
        title: 'Cập nhật',
        message: `Đã ${device.is_active ? 'vô hiệu hóa' : 'kích hoạt'} thiết bị "${device.name}"`,
      });
      fetchDevices();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể đổi trạng thái',
      });
    }
  };

  const handleExportJson = () => {
    window.open('/api/v1/devices/export', '_blank');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await deviceApi.importJson(content);
        addToast({
          type: 'success',
          title: 'Import thành công',
          message: `Đã nhập ${res.count} thiết bị từ file JSON`,
        });
        fetchDevices();
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Lỗi import file',
          message: err.message || 'File JSON không đúng định dạng',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            Quản lý Thiết bị & Tablet LAN
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Ánh xạ địa chỉ IP sang tên máy để ghi nhận chính xác trong Audit Log
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={<Download size={16} />} onClick={handleExportJson}>
            Xuất JSON
          </Button>

          <label style={{ display: 'inline-flex', cursor: 'pointer' }}>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              style={{ display: 'none' }}
            />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 1.1rem',
                fontSize: '0.95rem',
                minHeight: '42px',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Upload size={16} /> Nhập JSON
            </span>
          </label>

          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingDevice(null);
              setIsModalOpen(true);
            }}
          >
            Thêm thiết bị
          </Button>
        </div>
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
                <th style={{ padding: '0.85rem 1rem' }}>Địa chỉ IP</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tên thiết bị</th>
                <th style={{ padding: '0.85rem 1rem' }}>Mô tả vị trí</th>
                <th style={{ padding: '0.85rem 1rem' }}>Trạng thái</th>
                <th style={{ padding: '0.85rem 1rem' }}>Ngày thêm</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Đang tải danh sách thiết bị...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Chưa có thiết bị nào được đăng ký. Các IP lạ vẫn được phép truy cập và ghi nhận là "Unknown (IP)".
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                      {device.ip_address}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Tablet size={16} style={{ color: 'var(--text-muted)' }} />
                        {device.name}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {device.description || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Badge status={device.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(device.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            setEditingDevice(device);
                            setIsModalOpen(true);
                          }}
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                          }}
                          title="Chỉnh sửa thiết bị"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(device)}
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: device.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: device.is_active ? 'var(--danger)' : 'var(--success)',
                            display: 'flex',
                          }}
                          title={device.is_active ? 'Vô hiệu hóa thiết bị' : 'Kích hoạt lại'}
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

      <DeviceFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDevice(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingDevice}
      />
    </div>
  );
};
