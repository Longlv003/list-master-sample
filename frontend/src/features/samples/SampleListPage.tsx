import { useCachedQuery, useTabState } from "../../hooks/useCachedQuery";
import React, { useState, useEffect } from 'react';
import { sampleApi } from '../../services/sample.service';
import { Sample, SampleFormData } from '../../types/sample.types';
import { useAuthStore } from '../../store/auth.store';
import { useToastStore } from '../../store/toast.store';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SampleFormModal } from './SampleFormModal';
import { SampleDeletedModal } from './SampleDeletedModal';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  RotateCcw,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export const SampleListPage: React.FC = () => {
  const [page, setPage] = useTabState("samples.page", 1);
  const [limit] = useState(20);

  // Filters & sorting
  const [search, setSearch] = useTabState("samples.search", '');
  const [expiryStatus, setExpiryStatus] = useTabState<string>("samples.expiryStatus", 'all');
  const [sortBy, setSortBy] = useTabState("samples.sortBy", 'no');
  const [sortOrder, setSortOrder] = useTabState<'asc' | 'desc'>("samples.sortOrder", 'asc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);

  // Confirm delete dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    targetId?: string;
    isBulk?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const { canAdd, canUpdate, canDelete, canRestore } = useAuthStore();
  const { addToast } = useToastStore();

  const filter = {
    page, limit, search: search.trim() || undefined, sortBy, sortOrder,
    expiryStatus: expiryStatus !== 'all' ? expiryStatus : undefined,
  };
  const { data, isLoading, refresh: fetchSamples } = useCachedQuery(
    `samples:${JSON.stringify(filter)}`, () => sampleApi.getAll(filter),
    (error) => addToast({ type: 'error', title: 'Lỗi tải dữ liệu', message: error.message }),
  );
  const samples = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  useSocket(fetchSamples);
  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => samples.some((sample) => sample.id === id)));
  }, [data]);

  // Handle Search Input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Toggle selection
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(samples.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Sort toggle
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Add / Edit form submit
  const handleFormSubmit = async (formData: SampleFormData) => {
    try {
      if (editingSample) {
        await sampleApi.update(editingSample.id, formData);
        addToast({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật mẫu thử "${formData.sample_code}"`,
        });
      } else {
        await sampleApi.create(formData);
        addToast({
          type: 'success',
          title: 'Thành công',
          message: `Đã thêm mẫu thử "${formData.sample_code}"`,
        });
      }
      setIsFormOpen(false);
      setEditingSample(null);
      fetchSamples();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi lưu dữ liệu',
        message: err.message || 'Không thể lưu mẫu thử',
      });
    }
  };

  // Delete single
  const requestDeleteSingle = (sample: Sample) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa mẫu thử',
      message: `Bạn có chắc chắn muốn xóa mềm mẫu "${sample.sample_code}" (STT: ${sample.no ?? 'N/A'})? Bản ghi có thể được khôi phục từ Thùng rác.`,
      targetId: sample.id,
      isBulk: false,
    });
  };

  // Delete bulk
  const requestDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa nhiều mẫu thử',
      message: `Bạn có chắc chắn muốn xóa mềm ${selectedIds.length} mẫu thử đã chọn? Tất cả có thể được khôi phục từ Thùng rác.`,
      isBulk: true,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (confirmDialog.isBulk) {
        await sampleApi.deleteBulk(selectedIds);
        addToast({
          type: 'success',
          title: 'Đã xóa',
          message: `Đã xóa mềm ${selectedIds.length} mẫu thử.`,
        });
        setSelectedIds([]);
      } else if (confirmDialog.targetId) {
        await sampleApi.delete(confirmDialog.targetId);
        addToast({
          type: 'success',
          title: 'Đã xóa',
          message: 'Đã xóa mềm mẫu thử thành công.',
        });
      }
      setConfirmDialog({ isOpen: false, title: '', message: '' });
      fetchSamples();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi xóa',
        message: err.message || 'Không thể xóa mẫu thử',
      });
    }
  };

  // Export to Excel
  const handleExportExcel = () => { window.open(sampleApi.exportUrl(filter), '_blank'); };

  // Counts for summary banner
  const expiredCount = samples.filter((s) => s.expiry_status === 'expired').length;
  const expiringCount = samples.filter((s) => s.expiry_status === 'expiring').length;

  return (
    <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>


      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Danh sách Mẫu thử
          </h1>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {canDelete() && selectedIds.length > 0 && (
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={requestDeleteBulk}
            >
              Xóa đã chọn ({selectedIds.length})
            </Button>
          )}

          {canRestore() && (
            <Button
              variant="outline"
              icon={<RotateCcw size={16} />}
              onClick={() => setIsDeletedModalOpen(true)}
            >
              Thùng rác
            </Button>
          )}

          {canUpdate() && (
            <Button
              variant="secondary"
              icon={<FileSpreadsheet size={16} />}
              onClick={handleExportExcel}
            >
              Xuất Excel
            </Button>
          )}

          {canAdd() && (
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => {
                setEditingSample(null);
                setIsFormOpen(true);
              }}
            >
              Thêm mẫu mới
            </Button>
          )}
        </div>
      </div>

      {/* Search & Status Filters */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Tìm theo mã mẫu, item code, layer, chương trình, comment..."
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Expiry filter tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'expired', label: 'Đã hết hạn' },
              { id: 'expiring', label: 'Sắp hết hạn' },
              { id: 'valid', label: 'Còn hạn' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setExpiryStatus(tab.id);
                  setPage(1);
                }}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: expiryStatus === tab.id ? 'var(--primary)' : 'var(--bg-surface)',
                  color: expiryStatus === tab.id ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${expiryStatus === tab.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  transition: 'var(--transition)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr
                style={{
                  backgroundColor: '#1e293b',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {canDelete() && (
                  <th style={{ padding: '0.75rem 0.5rem', width: '36px', textAlign: 'center', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}>
                    <input
                      type="checkbox"
                      checked={samples.length > 0 && selectedIds.length === samples.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th
                  style={{ padding: '0.75rem 0.5rem', cursor: 'pointer', width: '50px', textAlign: 'center', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}
                  onClick={() => handleSort('no')}
                >
                  STT
                </th>
                <th
                  style={{ padding: '0.75rem 0.65rem', cursor: 'pointer', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}
                  onClick={() => handleSort('sample_code')}
                >
                  Mã mẫu / Item
                </th>
                <th
                  style={{ padding: '0.75rem 0.5rem', cursor: 'pointer', textAlign: 'center', width: '50px', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}
                  onClick={() => handleSort('quantity')}
                >
                  SL
                </th>
                <th style={{ padding: '0.75rem 0.5rem', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}>Layer</th>
                <th style={{ padding: '0.75rem 0.5rem', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}>Chương trình</th>
                <th
                  style={{ padding: '0.75rem 0.5rem', cursor: 'pointer', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}
                  onClick={() => handleSort('made_date')}
                >
                  Ngày làm
                </th>
                <th
                  style={{ padding: '0.75rem 0.5rem', cursor: 'pointer', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}
                  onClick={() => handleSort('expiry_date')}
                >
                  Hạn dùng
                </th>
                <th style={{ padding: '0.75rem 0.5rem', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 0.5rem', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}>Ghi chú</th>
                {(canUpdate() || canDelete()) && (
                  <th style={{ padding: '0.75rem 0.65rem', textAlign: 'right', width: '85px', backgroundColor: '#1e293b', borderBottom: '2px solid var(--border-subtle)' }}>
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
                  >
                    Đang tải dữ liệu mẫu thử...
                  </td>
                </tr>
              ) : samples.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
                  >
                    Không tìm thấy mẫu thử nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                samples.map((sample, idx) => {
                  const isSelected = selectedIds.includes(sample.id);

                  // Color row background and left border based on expiry_status
                  let rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)';
                  let rowBorderLeft = '4px solid transparent';

                  if (sample.expiry_status === 'expired') {
                    rowBg = 'rgba(239, 68, 68, 0.12)';
                    rowBorderLeft = '4px solid var(--danger)';
                  } else if (sample.expiry_status === 'expiring') {
                    rowBg = 'rgba(245, 158, 11, 0.12)';
                    rowBorderLeft = '4px solid var(--warning)';
                  } else if (sample.expiry_status === 'valid') {
                    rowBg = 'rgba(16, 185, 129, 0.07)';
                    rowBorderLeft = '4px solid var(--success)';
                  }

                  if (isSelected) {
                    rowBg = 'rgba(99, 102, 241, 0.2)';
                  }

                  return (
                    <tr
                      key={sample.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        borderLeft: rowBorderLeft,
                        backgroundColor: rowBg,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {canDelete() && (
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(sample.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        {sample.no ?? '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div>{sample.sample_code}</div>
                        {sample.item_code && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {sample.item_code}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                        {sample.quantity}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {sample.layer || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {sample.program_name || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {sample.made_date || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
                        <span
                          style={{
                            color:
                              sample.expiry_status === 'expired'
                                ? 'var(--danger)'
                                : sample.expiry_status === 'expiring'
                                  ? 'var(--warning)'
                                  : 'var(--success)',
                          }}
                        >
                          {sample.expiry_date || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <Badge status={sample.expiry_status} />
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 0.5rem',
                          color: 'var(--text-muted)',
                          maxWidth: '130px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.82rem',
                        }}
                        title={sample.comment || ''}
                      >
                        {sample.comment || '—'}
                      </td>
                      {(canUpdate() || canDelete()) && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            {canUpdate() && (
                              <button
                                onClick={() => {
                                  setEditingSample(sample);
                                  setIsFormOpen(true);
                                }}
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--bg-surface-elevated)',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Chỉnh sửa mẫu"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {canDelete() && (
                              <button
                                onClick={() => requestDeleteSingle(sample)}
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: 'var(--danger)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Xóa mềm mẫu"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>

      {/* Form Modal (Add / Edit) */}
      <SampleFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSample(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSample}
      />

      {/* Deleted Samples (Trash) Modal */}
      <SampleDeletedModal
        isOpen={isDeletedModalOpen}
        onClose={() => setIsDeletedModalOpen(false)}
        onRestored={fetchSamples}
      />

      {/* Confirm Delete Dialog (AC5) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
};
