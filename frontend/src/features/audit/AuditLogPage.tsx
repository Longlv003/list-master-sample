import { dateBoundary } from '../../utils/date';
import { useCachedQuery, useTabState } from "../../hooks/useCachedQuery";
import React, { useState } from 'react';
import { auditApi } from '../../services/audit.service';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { useToastStore } from '../../store/toast.store';
import {
  History,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Tablet,
  Calendar,
} from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [page, setPage] = useTabState("audit.page", 1);
  const [limit] = useState(25);

  // Filters
  const [actionFilter, setActionFilter] = useTabState("audit.actionFilter", '');
  const [startDate, setStartDate] = useTabState("audit.startDate", '');
  const [endDate, setEndDate] = useTabState("audit.endDate", '');

  const { addToast } = useToastStore();

  const filter = {
    page, limit, action: actionFilter.trim() || undefined,
    startDate: startDate ? dateBoundary(startDate) : undefined,
    endDate: endDate ? dateBoundary(endDate, true) : undefined,
  };
  const { data, isLoading } = useCachedQuery(
    `audit:${JSON.stringify(filter)}`, () => auditApi.query(filter),
    (error) => addToast({ type: 'error', title: 'Lỗi tải Audit Log', message: error.message }),
  );
  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleExport = () => {
    const url = auditApi.exportUrl({
      action: actionFilter.trim() || undefined,
      startDate: startDate ? dateBoundary(startDate) : undefined,
      endDate: endDate ? dateBoundary(endDate, true) : undefined,
    });
    window.open(url, '_blank');
  };

  const formatAction = (action: string) => {
    switch (action) {
      case 'sample.create':
        return <Badge variant="info">Thêm mẫu</Badge>;
      case 'sample.update':
        return <Badge variant="warning">Sửa mẫu</Badge>;
      case 'sample.soft_delete':
      case 'sample.bulk_delete':
        return <Badge variant="danger">Xóa mẫu</Badge>;
      case 'sample.restore':
        return <Badge variant="success">Khôi phục</Badge>;
      case 'auth.login':
        return <Badge variant="success">Đăng nhập</Badge>;
      case 'auth.logout':
        return <Badge variant="neutral">Đăng xuất</Badge>;
      case 'auth.login_failed':
        return <Badge variant="danger">Login sai</Badge>;
      case 'sync.completed':
        return <Badge variant="success">Sync Excel</Badge>;
      case 'sync.conflict_resolved':
        return <Badge variant="warning">Xử lý conflict</Badge>;
      case 'permission.denied':
        return <Badge variant="danger">Bị từ chối quyền</Badge>;
      default:
        return <Badge variant="neutral">{action}</Badge>;
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
            Nhật ký Hoạt động (Audit Log)
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Lưu vết toàn bộ thao tác, tài khoản thực hiện, địa chỉ IP và tên máy tính/tablet
          </p>
        </div>

        <Button variant="outline" icon={<Download size={16} />} onClick={handleExport}>
          Xuất file JSONL
        </Button>
      </div>

      {/* Filters */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Lọc theo hành động (master, sample, auth, user)..."
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              outline: 'none',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Từ ngày:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem',
              outline: 'none',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đến ngày:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem',
              outline: 'none',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {(actionFilter || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActionFilter('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
          >
            Đặt lại
          </Button>
        )}
      </div>

      {/* Audit Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
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
                <th style={{ padding: '0.85rem 1rem' }}>Thời gian</th>
                <th style={{ padding: '0.85rem 1rem' }}>Hành động</th>
                <th style={{ padding: '0.85rem 1rem' }}>Người thực hiện</th>
                <th style={{ padding: '0.85rem 1rem' }}>Thiết bị (IP)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Đối tượng</th>
                <th style={{ padding: '0.85rem 1rem' }}>Chi tiết thay đổi</th>
                <th style={{ padding: '0.85rem 1rem' }}>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    Đang đọc nhật ký thao tác từ file JSONL...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    Không có bản ghi nhật ký nào phù hợp.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.ts).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {formatAction(log.action)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.actor_name || 'Khách (Chưa login)'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.device_name || 'Unknown'}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {log.ip}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)}...)` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                      {log.new_value ? (
                        <pre
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            overflowX: 'auto',
                            maxHeight: '60px',
                            color: '#a5b4fc',
                          }}
                        >
                          {JSON.stringify(log.new_value)}
                        </pre>
                      ) : log.old_value ? (
                        <pre
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            overflowX: 'auto',
                            maxHeight: '60px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {JSON.stringify(log.old_value)}
                        </pre>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {log.result === 'success' ? (
                        <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <CheckCircle size={15} /> OK
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <XCircle size={15} /> Thất bại
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </div>
    </div>
  );
};
