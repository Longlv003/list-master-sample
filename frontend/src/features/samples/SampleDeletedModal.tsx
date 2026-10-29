import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Sample } from '../../types/sample.types';
import { sampleApi } from '../../services/sample.service';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useToastStore } from '../../store/toast.store';

export interface SampleDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export const SampleDeletedModal: React.FC<SampleDeletedModalProps> = ({
  isOpen,
  onClose,
  onRestored,
}) => {
  const [deletedSamples, setDeletedSamples] = useState<Sample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const fetchDeleted = async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await sampleApi.getDeleted();
      setDeletedSamples(res.items);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể tải danh sách đã xóa',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, [isOpen]);

  const handleRestore = async (id: string, code: string) => {
    setRestoringId(id);
    try {
      await sampleApi.restore(id);
      addToast({
        type: 'success',
        title: 'Thành công',
        message: `Đã khôi phục mẫu thử "${code}"`,
      });
      setDeletedSamples((prev) => prev.filter((s) => s.id !== id));
      onRestored();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể khôi phục',
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thùng rác - Mẫu thử đã xóa mềm" maxWidth="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Đang tải dữ liệu thùng rác...
          </div>
        ) : deletedSamples.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Trash2 size={40} style={{ opacity: 0.4 }} />
            <div>Thùng rác trống. Không có mẫu thử nào bị xóa mềm.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Mã mẫu</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Số lượng</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Ngày xóa</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {deletedSamples.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.sample_code}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{s.quantity}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {s.deleted_at ? new Date(s.deleted_at).toLocaleString('vi-VN') : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleRestore(s.id, s.sample_code)}
                        isLoading={restoringId === s.id}
                        icon={<RotateCcw size={14} />}
                      >
                        Khôi phục
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
