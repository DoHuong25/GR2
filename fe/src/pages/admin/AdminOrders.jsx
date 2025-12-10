// src/pages/admin/AdminOrders.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../services/http";

// Mapping từ tiếng Việt (display) sang tiếng Anh (enum backend)
const STATUS_MAP = {
  "Chờ xác nhận": "pending",
  "Đang xử lý": "processing",
  "Đang giao hàng": "shipping",
  "Hoàn thành": "completed",
  "Đã hủy": "cancelled",
  "Hoàn trả": "returned",
};

// Reverse mapping: enum backend sang tiếng Việt (display)
const REVERSE_STATUS_MAP = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Hoàn trả",
};

const ALL_STATUSES = [
  "Chờ xác nhận",
  "Đang xử lý",
  "Đang giao hàng",
  "Hoàn thành",
  "Đã hủy",
  "Hoàn trả",
];

function badgeClass(status) {
  // status có thể là enum tiếng Anh từ backend
  const displayStatus = REVERSE_STATUS_MAP[status] || status;
  
  switch (displayStatus) {
    case "Hoàn thành":
      return "bg-success-subtle text-success";
    case "Chờ xác nhận":
    case "Đang xử lý":
    case "Đang giao hàng":
      return "bg-primary-subtle text-primary";
    case "Đã hủy":
    case "Hoàn trả":
      return "bg-danger-subtle text-danger";
    default:
      return "bg-secondary-subtle text-secondary";
  }
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = currentUser?.role === "admin";
  const isEmployee = currentUser?.role === "employee";

  const allowedStatus = isEmployee
    ? ALL_STATUSES.filter((s) => s !== "Đã hủy" && s !== "Hoàn trả")
    : ALL_STATUSES;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Chuyển tiếng Việt sang enum tiếng Anh khi gửi query
      const statusToSend = statusFilter === "all" ? "all" : STATUS_MAP[statusFilter];
      
      const res = await http.get("/admin/orders", {
        params: {
          status: statusToSend,
          q: q || undefined,
        },
      });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilter = (e) => {
    e?.preventDefault?.();
    fetchOrders();
  };

  const changeStatus = async (orderId, newStatus) => {
    if (!newStatus) return;

    // FE chặn thêm cho nhân viên
    if (
      isEmployee &&
      (newStatus === "Đã hủy" || newStatus === "Hoàn trả")
    ) {
      alert("Nhân viên không có quyền hủy / hoàn trả đơn.");
      return;
    }

    try {
      // Chuyển tiếng Việt sang enum tiếng Anh
      const enumStatus = STATUS_MAP[newStatus];
      const res = await http.put(`/admin/orders/${orderId}/status`, {
        status: enumStatus,
      });
      const updated = res.data;
      setOrders((prev) =>
        prev.map((o) => (o._id === updated._id ? updated : o))
      );
      // Phát sự kiện để customer nhận thông báo
      window.dispatchEvent(new Event("notificationUpdated"));
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
          "Cập nhật trạng thái thất bại."
      );
    }
  };

  return (
    <div className="container-fluid py-2">
      {/* FILTER */}
      <div className="card border-0 shadow-sm rounded-4 mb-3 p-3">
        <form onSubmit={onFilter}>
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small text-muted">
                Tìm theo tên / SĐT
              </label>
              <input
                className="form-control"
                placeholder="Nhập tên hoặc số điện thoại khách..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted">
                Trạng thái
              </label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <button
                type="submit"
                className="btn btn-primary mt-3 mt-md-0 w-100"
                disabled={loading}
              >
                Lọc
              </button>
            </div>
          </div>
        </form>

        {/* Quick filter buttons */}
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted d-block mb-2">Lọc nhanh:</small>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className={`btn btn-sm ${statusFilter === "all" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => {
                setStatusFilter("all");
                setQ("");
              }}
            >
              📋 Tất cả
            </button>
            <button
              className={`btn btn-sm ${statusFilter === "Chờ thanh toán" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter("Chờ thanh toán")}
            >
              ⏳ Chờ thanh toán
            </button>
            <button
              className={`btn btn-sm ${statusFilter === "Đang xử lý" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter("Đang xử lý")}
            >
              ⚙️ Đang xử lý
            </button>
            <button
              className={`btn btn-sm ${statusFilter === "Đang giao hàng" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter("Đang giao hàng")}
            >
              🚚 Đang giao hàng
            </button>
            <button
              className={`btn btn-sm ${statusFilter === "Hoàn thành" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter("Hoàn thành")}
            >
              ✅ Hoàn thành
            </button>
            <button
              className={`btn btn-sm ${statusFilter === "Đã hủy" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter("Đã hủy")}
            >
              ❌ Đã hủy
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-2">
            <h5 className="mb-0">Danh sách đơn hàng</h5>
            <small className="text-muted">
              {orders.length} đơn hàng
            </small>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted">
              Đang tải...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Không có đơn hàng.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="small text-muted">
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách</th>
                    <th>SĐT</th>
                    <th>Địa chỉ</th>
                    <th>Thanh toán</th>
                    <th>Ngày tạo</th>
                    <th className="text-end">Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th className="text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td className="small fw-semibold">
                        #{String(o._id).slice(-6)}
                      </td>
                      <td className="small">
                        {o?.shippingAddress?.name ||
                          o?.customer?.username ||
                          "—"}
                      </td>
                      <td className="small">
                        {o?.shippingAddress?.phone || "—"}
                      </td>
                      <td className="small text-truncate" style={{ maxWidth: 220 }}>
                        {o?.shippingAddress?.address || "—"}
                      </td>
                      <td className="small">
                        {o.paymentMethod || "—"}
                      </td>
                      <td className="small text-muted">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleString(
                              "vi-VN"
                            )
                          : "—"}
                      </td>
                      <td className="small text-end">
                        {(o.total || 0).toLocaleString("vi-VN")}đ
                      </td>
                      <td>
                        <select
                          className={
                            "form-select form-select-sm " +
                            badgeClass(o.status)
                          }
                          value={REVERSE_STATUS_MAP[o.status] || o.status}
                          onChange={(e) =>
                            changeStatus(o._id, e.target.value)
                          }
                        >
                          {allowedStatus.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/admin/orders/${o._id}`)}
                          title="Xem chi tiết"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
