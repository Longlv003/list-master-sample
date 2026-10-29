import { localDate } from '../../utils/date';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ImageLightboxModal } from "../../components/gallery/ImageLightboxModal";
import { Button } from "../../components/ui/Button";
import { useCachedQuery, useTabState } from "../../hooks/useCachedQuery";
import { getSocket } from "../../hooks/useSocket";
import {
  DashboardRecord,
  dashboardService,
} from "../../services/dashboard.service";
import { copyText } from "../../utils/clipboard";

export const DashboardPage: React.FC = () => {
  const [page, setPage] = useTabState("dashboard.page", 1);
  const [limit] = useState(50);
  const [refreshing, setRefreshing] = useState(false);
  const [scanStatus, setScanStatus] = useState({
    running: false,
    scanned: 0,
    addedOrUpdated: 0, status: 'success', errors: [] as string[],
  });
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const status = await dashboardService.getScanStatus();
        if (!cancelled) setScanStatus(status);
      } catch {
        /* Data remains usable while reconnecting. */
      } finally {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  const [defaultDatesApplied, setDefaultDatesApplied] = useTabState('dashboard.defaultDatesApplied', false);
  const scanRefreshInProgress = useRef(false);

  // Filters
  const [itemCode, setItemCode] = useTabState("dashboard.itemCode", "");
  const [lotId, setLotId] = useTabState("dashboard.lotId", "");
  const [barcodeId, setBarcodeId] = useTabState("dashboard.barcodeId", "");
  const [scanNum, setScanNum] = useTabState<string>("dashboard.scanNum", "");
  const [cvrNum, setCvrNum] = useTabState<string>("dashboard.cvrNum", "");
  const [fromDate, setFromDate] = useTabState<string>("dashboard.fromDate", "");
  const [toDate, setToDate] = useTabState<string>("dashboard.toDate", "");
  const [hasWarning, setHasWarning] = useTabState<boolean>(
    "dashboard.hasWarning",
    false,
  );

  useEffect(() => {
    if (defaultDatesApplied) return;
    let cancelled = false;
    fetch('/api/health').then(response => response.json()).then(health => {
      if (cancelled) return;
      if (!fromDate && !toDate) {
        const end = new Date(), start = new Date();
        start.setDate(start.getDate() - Math.max(0, (health.defaults?.dateRangeDays || 30) - 1));
        setFromDate(localDate(start)); setToDate(localDate(end));
      }
      setDefaultDatesApplied(true);
    }).catch(() => {});
    return () => {cancelled = true;};
  }, [defaultDatesApplied]);

  // Toast / Copy path
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox Modal
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [autoImages, setAutoImages] = useState<{ name: string; url: string }[]>(
    [],
  );
  const [manualImages, setManualImages] = useState<
    { name: string; url: string }[]
  >([]);

  const filter = {
    itemCode: itemCode || undefined,
    lotId: lotId || undefined,
    barcodeId: barcodeId || undefined,
    scanNum: scanNum ? parseInt(scanNum, 10) : undefined,
    cvrNum: cvrNum ? parseInt(cvrNum, 10) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    hasWarning: hasWarning || undefined,
    page,
    limit,
  };
  const {
    data,
    isLoading: loading,
    refresh: fetchData,
    revalidate,
  } = useCachedQuery(
    `dashboard:${JSON.stringify(filter)}`,
    () => dashboardService.getDashboardData(filter),
    (error) => console.error("Lỗi tải dữ liệu Dashboard:", error),
  );
  const records = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      if (!scanRefreshInProgress.current) void revalidate();
    };
    const events = ['connect', 'dashboard.updated', 'master.created', 'master.updated', 'master.deleted', 'master.restored'];
    events.forEach(event => socket.on(event, handleUpdate));
    return () => {
      events.forEach(event => socket.off(event, handleUpdate));
    };
  }, [revalidate]);

  const handleRefresh = async () => {
    if (scanRefreshInProgress.current) return;
    scanRefreshInProgress.current = true;
    setRefreshing(true);
    try {
      const result = await dashboardService.triggerRefresh();
      if (result.status !== 'success') alert('Quét chưa hoàn tất: ' + (result.errors || []).join('; '));
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể quét UNC");
    } finally {
      scanRefreshInProgress.current = false;
      setRefreshing(false);
    }
  };

  const handleCopyPath = async (pathText: string, id: string) => {
    try {
      await copyText(pathText);
      setCopiedId(id);
      setTimeout(
        () => setCopiedId((current) => (current === id ? null : current)),
        2000,
      );
    } catch {
      window.prompt(
        "Không thể tự sao chép. Nhấn Ctrl+C để copy đường dẫn:",
        pathText,
      );
    }
  };

  const handleOpenGallery = async (record: DashboardRecord) => {
    setLightboxTitle(
      `${record.item_code} | Barcode ${record.barcode_id} (${record.run_date})`,
    );
    try {
      const images = await dashboardService.getFolderImages(record.id);
      setAutoImages(images.autoImages);
      setManualImages(images.manualImages);
      setLightboxOpen(true);
    } catch (err) {
      alert("Không thể tải danh sách ảnh cho thư mục này");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      {/* Title & Action Buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Dashboard Quản lý Chạy Master Sample
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
              style={{ marginRight: "0.4rem" }}
            />
            {refreshing ? "Đang quét..." : "Quét mới (Refresh)"}
          </Button>

          <a
            href={dashboardService.getExportUrl({
              itemCode,
              lotId,
              barcodeId,
              scanNum: scanNum ? parseInt(scanNum, 10) : undefined,
              cvrNum: cvrNum ? parseInt(cvrNum, 10) : undefined,
              fromDate,
              toDate, hasWarning,
            })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Button variant="primary">
              <Download size={16} style={{ marginRight: "0.4rem" }} />
              Xuất Excel
            </Button>
          </a>
        </div>
      </div>

      {/* Filter Card */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "1.5rem",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Mã Item
            </label>
            <input
              type="text"
              placeholder="VD: 7M051G, 6CRPV..."
              value={itemCode}
              onChange={(e) => {
                setItemCode(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Lot
            </label>
            <input
              type="text"
              placeholder="VD: 00079..."
              value={lotId}
              onChange={(e) => {
                setLotId(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Barcode (Panel ID)
            </label>
            <input
              type="text"
              placeholder="VD: 237..."
              value={barcodeId}
              onChange={(e) => {
                setBarcodeId(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Máy Scan
            </label>
            <input
              type="number"
              placeholder="VD: 3, 5..."
              value={scanNum}
              onChange={(e) => {
                setScanNum(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Máy CVR
            </label>
            <input
              type="number"
              placeholder="VD: 45, 47..."
              value={cvrNum}
              onChange={(e) => {
                setCvrNum(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <input
            type="checkbox"
            id="chkWarning"
            checked={hasWarning}
            onChange={(e) => {
              setHasWarning(e.target.checked);
              setPage(1);
            }}
          />
          <label
            htmlFor="chkWarning"
            style={{
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Chỉ hiện các bản ghi có cảnh báo sai lệch máy Scan
          </label>
        </div>
      </div>

      {scanStatus.status !== 'success' && <div role="alert" style={{padding: 12, color: 'var(--warning)'}}>
        {scanStatus.status === 'partial' ? 'Quét một phần' : 'Lỗi quét'}: {scanStatus.errors.join('; ')}. Hệ thống thử lại sau 60 giây.
      </div>}
      {/* Main Table */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.88rem",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--bg-hover)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <th style={{ padding: "0.75rem 1rem", width: "50px" }}>STT</th>
                <th style={{ padding: "0.75rem 1rem" }}>Date</th>
                <th style={{ padding: "0.75rem 1rem" }}>Sample Test</th>
                <th style={{ padding: "0.75rem 1rem" }}>Máy Scan</th>
                <th style={{ padding: "0.75rem 1rem" }}>Máy CVR</th>

                <th style={{ padding: "0.75rem 1rem" }}>Barcode</th>
                <th style={{ padding: "0.75rem 1rem" }}>Program scan</th>
                <th style={{ padding: "0.75rem 1rem" }}>Ảnh</th>
                <th style={{ padding: "0.75rem 1rem" }}>Link folder</th>
                <th style={{ padding: "0.75rem 1rem" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Không tìm thấy bản ghi nào khớp với điều kiện lọc
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: r.mapping_warning || r.metadata_warning || r.match_warning || r.source_status !== 'online'
                        ? "rgba(239, 68, 68, 0.08)"
                        : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      {r.run_date}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {r.sample_code ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--primary)",
                            display: "block",
                          }}
                        >
                          {r.sample_code}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            display: "block",
                          }}
                        >
                          {r.item_code}
                        </span>
                      )}
                      <div
                        style={{
                          fontSize: "0.73rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.1rem",
                        }}
                      >
                        {r.item_code}
                        {r.lot_id ? ` · ${r.lot_id}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--primary-light)",
                          color: "var(--primary)",
                          fontWeight: 700,
                        }}
                      >
                        Scan #{r.folder_scan_num}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(2, 132, 199, 0.15)",
                          color: "#38bdf8",
                          fontWeight: 700,
                        }}
                      >
                        CVR #{r.cvr_machine_num}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {r.barcode_id}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {r.job_name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <button
                        onClick={() => handleOpenGallery(r)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg-hover)",
                          color: "var(--text-primary)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        <ImageIcon size={14} />
                        Xem ({r.auto_images_count + r.manual_images_count})
                      </button>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => handleCopyPath(r.folder_path, r.id)}
                          title="Sao chép đường dẫn UNC"
                          style={{
                            padding: "0.35rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-primary)",
                            color:
                              copiedId === r.id
                                ? "var(--success)"
                                : "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          {copiedId === r.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          {copiedId === r.id ? "Đã copy" : "Copy path"}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {r.mapping_warning || r.metadata_warning || r.match_warning || r.source_status !== 'online' ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--danger-light)",
                            color: "var(--danger)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                          }}
                          title={[r.source_status !== 'online' ? r.source_status : '', r.warning_message, r.metadata_warning, r.match_warning].filter(Boolean).join('; ')}
                        >
                          <AlertTriangle size={14} />
                          {[r.source_status !== 'online' ? r.source_status : '', r.warning_message, r.metadata_warning, r.match_warning].filter(Boolean).join('; ')}
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "var(--success)",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          {r.source_status !== 'online' ? r.source_status : r.metadata_warning || r.match_warning || 'Mapping khớp'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Hiển thị <strong>{records.length}</strong> /{" "}
            <strong>{total}</strong> kết quả (Trang {page}/{totalPages || 1})
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        folderTitle={lightboxTitle}
        autoImages={autoImages}
        manualImages={manualImages}
      />
    </div>
  );
};
