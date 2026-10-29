import { localDate } from '../../utils/date';
import { useCachedQuery, useTabState } from "../../hooks/useCachedQuery";
import { getSocket } from "../../hooks/useSocket";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import {
  MasterSample,
  masterSampleClientService,
} from "../../services/masterSample.service";
import { useAuthStore } from "../../store/auth.store";

export const MasterSampleListPage: React.FC = () => {
  const { canAdd, canUpdate, canDelete, canRestore } = useAuthStore();
  const [page, setPage] = useTabState("masterSample.page", 1);
  const [limit] = useState(50);
  const [warningDays, setWarningDays] = useState(7);
  useEffect(() => { fetch('/api/health').then(res => res.json()).then(health => setWarningDays(health.defaults?.expiryWarningDays ?? 7)).catch(() => {}); }, []);

  // Filters
  const [search, setSearch] = useTabState("masterSample.search", "");
  const [item, setItem] = useTabState("masterSample.item", "");
  const [lot, setLot] = useTabState("masterSample.lot", "");
  const [barcodeId, setBarcodeId] = useTabState("masterSample.barcodeId", "");
  const [status, setStatus] = useTabState<string>("masterSample.status", "all");

  // Selected checkbox
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog Add/Edit
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSampleCode, setFormSampleCode] = useState("");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formItem, setFormItem] = useState("");
  const [formLot, setFormLot] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formLayer, setFormLayer] = useState("OL");
  const [formProgramName, setFormProgramName] = useState("");
  const [formMfgDate, setFormMfgDate] = useState("");
  const [formExpDate, setFormExpDate] = useState("");

  // Dialog Restore
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [deletedItems, setDeletedItems] = useState<MasterSample[]>([]);
  const [selectedRestoreIds, setSelectedRestoreIds] = useState<string[]>([]);

  const filter = {
    search: search || undefined, item: item || undefined, lot: lot || undefined,
    barcodeId: barcodeId || undefined, status: status !== "all" ? status : undefined, page, limit,
  };
  const { data, isLoading: loading, refresh: fetchList, revalidate } = useCachedQuery(
    `master-samples:${JSON.stringify(filter)}`, () => masterSampleClientService.getList(filter),
    (error) => console.error("Lỗi lấy danh sách Master Sample:", error),
  );
  const items = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  useEffect(() => {
    const socket = getSocket();
    const update = () => { void revalidate(); };
    const events = ['connect', 'master.created', 'master.updated', 'master.deleted', 'master.restored'];
    events.forEach(event => socket.on(event, update));
    return () => { events.forEach(event => socket.off(event, update)); };
  }, [revalidate]);
  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => items.some((item) => item.id === id)));
  }, [data]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormSampleCode("");
    setFormQuantity("1");
    setFormItem("");
    setFormLot("");
    setFormBarcode("");
    setFormLayer("OL");
    setFormProgramName("");
    setFormMfgDate(localDate(new Date()));
    // Mặc định hạn 30 ngày
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    setFormExpDate(localDate(exp));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sample: MasterSample) => {
    setEditingId(sample.id);
    setFormSampleCode(sample.sampleCode || "");
    setFormQuantity(
      sample.quantity !== undefined && sample.quantity !== null
        ? String(sample.quantity)
        : "1",
    );
    setFormItem(sample.item || "");
    setFormLot(sample.lot || "");
    setFormBarcode(sample.barcodeId || "");
    setFormLayer(sample.layer || "OL");
    setFormProgramName(sample.programName || "");
    setFormMfgDate(sample.manufactureDate || "");
    setFormExpDate(sample.expiryDate || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!formItem.trim() || !formBarcode.trim()) {
      alert("Vui lòng nhập Item và Barcode");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sampleCode: formSampleCode.trim(),
        quantity: formQuantity.trim() ? Number(formQuantity) : 1,
        item: formItem.trim(),
        lot: formLot.trim(),
        barcodeId: formBarcode.trim(),
        layer: formLayer.trim(),
        programName: formProgramName.trim(),
        manufactureDate: formMfgDate,
        expiryDate: formExpDate,
      };

      if (editingId) {
        await masterSampleClientService.update(editingId, payload);
      } else {
        await masterSampleClientService.create(payload);
      }
      setIsModalOpen(false);
      fetchList();
    } catch (err: any) {
      alert(err.message || "Lỗi khi lưu dữ liệu");
    } finally { setSaving(false); }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa mềm ${selectedIds.length} bản ghi đã chọn?`,
      )
    ) {
      return;
    }

    try {
      await masterSampleClientService.delete(selectedIds);
      setSelectedIds([]);
      fetchList();
    } catch (err: any) {
      alert(err.message || "Lỗi khi xóa bản ghi");
    }
  };

  const handleOpenRestore = async () => {
    try {
      const res = await masterSampleClientService.getDeletedList();
      if (res && res.data) {
        setDeletedItems(res.data);
        setSelectedRestoreIds([]);
        setIsRestoreOpen(true);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải danh sách đã xóa");
    }
  };

  const handleExecuteRestore = async () => {
    if (selectedRestoreIds.length === 0) return;
    try {
      await masterSampleClientService.restore(selectedRestoreIds);
      setIsRestoreOpen(false);
      fetchList();
    } catch (err: any) {
      alert(err.message || "Lỗi khi khôi phục bản ghi");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((x) => x.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      {/* Title & Action Bar */}
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
            Danh sách Master Sample (Quản lý Hạn sử dụng)
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.65rem" }}>
          {canAdd() && (
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus size={16} style={{ marginRight: "0.35rem" }} />
              Thêm Master Sample
            </Button>
          )}

          {canDelete() && selectedIds.length > 0 && (
            <Button variant="danger" onClick={handleDeleteSelected}>
              <Trash2 size={16} style={{ marginRight: "0.35rem" }} />
              Xóa đã chọn ({selectedIds.length})
            </Button>
          )}

          {canRestore() && (
            <Button variant="secondary" onClick={handleOpenRestore}>
              <RotateCcw size={16} style={{ marginRight: "0.35rem" }} />
              Khôi phục (Restore)
            </Button>
          )}

          <a
            href={masterSampleClientService.getExportUrl({
              search,
              item,
              lot,
              barcodeId,
              status,
            })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Button variant="secondary">
              <Download size={16} style={{ marginRight: "0.35rem" }} />
              Xuất Excel
            </Button>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          boxShadow: "var(--shadow-sm)",
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
            Tìm kiếm chung
          </label>
          <input
            type="text"
            placeholder="Tìm theo Item, Lot, Barcode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
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
            Mã Item
          </label>
          <input
            type="text"
            placeholder="VD: 7M051G..."
            value={item}
            onChange={(e) => {
              setItem(e.target.value);
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
            value={lot}
            onChange={(e) => {
              setLot(e.target.value);
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
            Barcode ID
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
            Trạng thái hạn sử dụng
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
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
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="valid">Còn hạn sử dụng</option>
            <option value="expiring">Sắp hết hạn (≤ {warningDays} ngày)</option>
            <option value="expired">Đã hết hạn</option>
            <option value="unknown">Chưa xác định hạn dùng</option>
          </select>
        </div>
      </div>

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
                {canDelete() && (
                  <th style={{ padding: "0.75rem 1rem", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={
                        items.length > 0 && selectedIds.length === items.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                <th style={{ padding: "0.75rem 1rem", width: "45px" }}>STT</th>
                <th style={{ padding: "0.75rem 1rem" }}>Mã mẫu</th>
                <th style={{ padding: "0.75rem 1rem" }}>Số lượng</th>
                <th style={{ padding: "0.75rem 1rem" }}>Item code</th>
                <th style={{ padding: "0.75rem 1rem" }}>Lot</th>
                <th style={{ padding: "0.75rem 1rem" }}>Barcode ID</th>
                <th style={{ padding: "0.75rem 1rem" }}>Layer</th>
                <th style={{ padding: "0.75rem 1rem" }}>Tên chương trình</th>
                <th style={{ padding: "0.75rem 1rem" }}>Ngày làm mẫu</th>
                <th style={{ padding: "0.75rem 1rem" }}>Ngày hết hạn</th>
                <th style={{ padding: "0.75rem 1rem" }}>Tình trạng</th>
                {canUpdate() && (
                  <th style={{ padding: "0.75rem 1rem", width: "70px" }}>
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Đang tải danh sách Master Sample...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Không có bản ghi nào
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr
                    key={it.id}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    {canDelete() && (
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(it.id)}
                          onChange={(e) =>
                            handleSelectOne(it.id, e.target.checked)
                          }
                        />
                      </td>
                    )}
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {it.sampleCode || it.lot}
                    </td>
                    <td
                      style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                    >
                      {it.quantity ?? 1}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      {it.item}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {it.lot}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "#38bdf8",
                      }}
                    >
                      {it.barcodeId ? (
                        it.barcodeId
                      ) : (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Chưa có
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          backgroundColor:
                            it.layer === "DS"
                              ? "rgba(99, 102, 241, 0.15)"
                              : "rgba(16, 185, 129, 0.15)",
                          color: it.layer === "DS" ? "#818cf8" : "#34d399",
                        }}
                      >
                        {it.layer || "OL"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {it.programName || "-"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {it.manufactureDate}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      {it.expiryDate}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {it.status === 'unknown' && <span style={{color: 'var(--warning)'}}>Chưa xác định hạn dùng</span>}
                      {it.status === "expired" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--danger-light)",
                            color: "var(--danger)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          <AlertCircle size={14} />
                          Đã hết hạn
                        </span>
                      )}
                      {it.status === "expiring" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--warning-light)",
                            color: "var(--warning)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          <Clock size={14} />
                          Còn {it.daysRemaining} ngày
                        </span>
                      )}
                      {it.status === "valid" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--success-light)",
                            color: "var(--success)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          Còn hạn
                        </span>
                      )}
                    </td>
                    {canUpdate() && (
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button
                          onClick={() => handleOpenEdit(it)}
                          style={{
                            padding: "0.35rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-hover)",
                            color: "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.8rem",
                          }}
                        >
                          <Edit2 size={14} />
                          Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paging */}
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
            Hiển thị <strong>{items.length}</strong> / <strong>{total}</strong>{" "}
            dòng (Trang {page}/{totalPages || 1})
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh", overflowY: "auto",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {editingId
                  ? "Chỉnh sửa Master Sample"
                  : "Thêm mới Master Sample"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {/* Row 1: Mã mẫu & Số lượng */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Mã mẫu
                  </label>
                  <input
                    type="text"
                    placeholder="VD: M01, M02, 6CRPV..."
                    value={formSampleCode}
                    onChange={(e) => setFormSampleCode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
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
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Item code & Lot */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Item code <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 7M051G, 6CRPV..."
                    value={formItem}
                    onChange={(e) => setFormItem(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
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
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Lot
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 00079..."
                    value={formLot}
                    onChange={(e) => setFormLot(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Barcode ID & Layer */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Barcode ID <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 237..."
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
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
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Layer
                  </label>
                  <select
                    value={formLayer}
                    onChange={(e) => setFormLayer(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="OL">OL</option>
                    <option value="DS">DS</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Tên chương trình */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "0.35rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Tên chương trình
                </label>
                <input
                  type="text"
                  placeholder="VD: 6CRPV-0105-02-L..."
                  value={formProgramName}
                  onChange={(e) => setFormProgramName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Row 5: Ngày làm mẫu & Ngày hết hạn */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Ngày làm mẫu
                  </label>
                  <input
                    type="date"
                    required
                    value={formMfgDate}
                    onChange={(e) => setFormMfgDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
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
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Ngày hết hạn
                  </label>
                  <input
                    type="date"
                    required
                    value={formExpDate}
                    onChange={(e) => setFormExpDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
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
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary" isLoading={saving}>
                  {editingId ? "Lưu thay đổi" : "Thêm mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restore */}
      {isRestoreOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              width: "100%",
              maxWidth: "680px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Khôi phục Master Sample đã xóa mềm
              </h3>
              <button
                onClick={() => setIsRestoreOpen(false)}
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{ maxHeight: "400px", overflowY: "auto", padding: "1rem" }}
            >
              {deletedItems.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Không có bản ghi nào bị xóa
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <th style={{ padding: "0.5rem", width: "30px" }}>
                        <input
                          type="checkbox"
                          checked={
                            selectedRestoreIds.length === deletedItems.length
                          }
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedRestoreIds(
                                deletedItems.map((x) => x.id),
                              );
                            else setSelectedRestoreIds([]);
                          }}
                        />
                      </th>
                      <th style={{ padding: "0.5rem" }}>Item</th>
                      <th style={{ padding: "0.5rem" }}>Lot</th>
                      <th style={{ padding: "0.5rem" }}>Barcode</th>
                      <th style={{ padding: "0.5rem" }}>Thời điểm xóa</th>
                      <th style={{ padding: "0.5rem" }}>Người xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedItems.map((d) => (
                      <tr
                        key={d.id}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <td style={{ padding: "0.5rem" }}>
                          <input
                            type="checkbox"
                            checked={selectedRestoreIds.includes(d.id)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedRestoreIds((prev) => [
                                  ...prev,
                                  d.id,
                                ]);
                              else
                                setSelectedRestoreIds((prev) =>
                                  prev.filter((id) => id !== d.id),
                                );
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem", fontWeight: 600 }}>
                          {d.item}
                        </td>
                        <td style={{ padding: "0.5rem" }}>{d.lot}</td>
                        <td
                          style={{
                            padding: "0.5rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {d.barcodeId}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {d.deletedAt
                            ? new Date(d.deletedAt).toLocaleString("vi-VN")
                            : ""}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {d.deletedBy || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                padding: "1rem 1.25rem",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setIsRestoreOpen(false)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                disabled={selectedRestoreIds.length === 0}
                onClick={handleExecuteRestore}
              >
                Khôi phục ({selectedRestoreIds.length}) bản ghi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
