import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../../services/http";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

function badgeClass(status) {
  switch (status) {
    case "completed":
      return "bg-success-subtle text-success";
    case "processing":
    case "shipping":
    case "pending":
      return "bg-primary-subtle text-primary";
    case "cancelled":
    case "returned":
      return "bg-danger-subtle text-danger";
    default:
      return "bg-secondary-subtle text-secondary";
  }
}

const STATUS_MAP = {
  "Chờ xác nhận": "pending",
  "Đang xử lý": "processing",
  "Đang giao hàng": "shipping",
  "Hoàn thành": "completed",
  "Đã hủy": "cancelled",
  "Hoàn trả": "returned",
};

const REVERSE_STATUS_MAP = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Hoàn trả",
};

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [bankInfo, setBankInfo] = useState("");

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isEmployee = currentUser?.role === "employee";

  const ALL_STATUSES_ADMIN = [
    "Chờ xác nhận",
    "Đang xử lý",
    "Đang giao hàng",
    "Hoàn thành",
    "Đã hủy",
    "Hoàn trả",
  ];

  const ALL_STATUSES_EMPLOYEE = [
    "Chờ xác nhận",
    "Đang xử lý",
    "Đang giao hàng",
    "Hoàn thành",
  ];

  // Hàm để lấy danh sách status được phép từ status hiện tại
  const getAllowedNextStatuses = () => {
    if (!order) return [];
    const currentStatusDisplay = REVERSE_STATUS_MAP[order.status];
    
    let nextStatuses = [];
    
    if (currentStatusDisplay === "Chờ xác nhận") {
      nextStatuses = ["Đang xử lý", "Đã hủy"];
    } else if (currentStatusDisplay === "Đang xử lý") {
      nextStatuses = ["Đang giao hàng"];
    } else if (currentStatusDisplay === "Đang giao hàng") {
      nextStatuses = isEmployee ? ["Hoàn thành"] : ["Hoàn thành", "Đã hủy"];
    } else if (currentStatusDisplay === "Hoàn thành") {
      nextStatuses = isEmployee ? [] : ["Hoàn trả"];
    }
    
    return nextStatuses;
  };

  const allowedStatuses = isEmployee ? ALL_STATUSES_EMPLOYEE : ALL_STATUSES_ADMIN;

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await http.get(`/admin/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      alert("Không tải được chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatusDisplay) => {
    if (!newStatusDisplay || REVERSE_STATUS_MAP[order.status] === newStatusDisplay) return;

    const currentStatusDisplay = REVERSE_STATUS_MAP[order.status];

    // Kiểm tra transition hợp lệ
    // pending → processing (nhân viên xác nhận có hàng) hoặc pending → cancelled (hủy đơn)
    if (currentStatusDisplay === "Chờ xác nhận") {
      if (newStatusDisplay === "Đang xử lý") {
        setPendingStatus(newStatusDisplay);
        setShowConfirmModal(true);
        return;
      } else if (newStatusDisplay === "Đã hủy") {
        // Nếu khách đã thanh toán, yêu cầu thông tin hoàn tiền
        if (order.paymentMethod && order.paymentMethod !== "Thanh toán khi nhận hàng") {
          setShowRefundModal(true);
          setPendingStatus(newStatusDisplay);
          return;
        }
        await confirmStatusChange(newStatusDisplay);
        return;
      } else {
        alert("Từ trạng thái 'Chờ xác nhận' chỉ có thể chuyển sang 'Đang xử lý' hoặc 'Đã hủy'.");
        return;
      }
    }

    // processing → shipping (đang giao hàng)
    if (currentStatusDisplay === "Đang xử lý") {
      if (newStatusDisplay === "Đang giao hàng") {
        await confirmStatusChange(newStatusDisplay);
        return;
      } else if (newStatusDisplay === "Chờ xác nhận") {
        alert("Không thể quay lại 'Chờ xác nhận' từ 'Đang xử lý'.");
        return;
      } else {
        alert("Từ trạng thái 'Đang xử lý' chỉ có thể chuyển sang 'Đang giao hàng'.");
        return;
      }
    }

    // shipping → completed (đã giao hàng)
    if (currentStatusDisplay === "Đang giao hàng") {
      if (newStatusDisplay === "Hoàn thành") {
        await confirmStatusChange(newStatusDisplay);
        return;
      } else if (newStatusDisplay === "Đã hủy") {
        // Người giao có thể hủy nếu khách từ chối
        if (isEmployee) {
          alert("Nhân viên không có quyền hủy đơn ở trạng thái này. Liên hệ admin.");
          return;
        }
        await confirmStatusChange(newStatusDisplay);
        return;
      } else {
        alert("Từ trạng thái 'Đang giao hàng' chỉ có thể chuyển sang 'Hoàn thành' hoặc 'Đã hủy'.");
        return;
      }
    }

    // completed → returned (hoàn trả, admin xử lý)
    if (currentStatusDisplay === "Hoàn thành") {
      if (newStatusDisplay === "Hoàn trả") {
        if (isEmployee) {
          alert("Nhân viên không có quyền hoàn trả đơn.");
          return;
        }
        await confirmStatusChange(newStatusDisplay);
        return;
      } else {
        alert("Đơn hàng đã hoàn thành. Admin có thể xử lý hoàn trả nếu cần.");
        return;
      }
    }

    // Chặn các transition không hợp lệ khác
    alert("Chuyển đổi trạng thái này không được phép.");
  };

  const confirmStatusChange = async (newStatusDisplay) => {
    setUpdating(true);
    try {
      const newStatusEnum = STATUS_MAP[newStatusDisplay];
      const res = await http.put(`/admin/orders/${orderId}/status`, {
        status: newStatusEnum,
      });
      setOrder(res.data);
      setShowConfirmModal(false);
      setShowRefundModal(false);
      setPendingStatus(null);
      setBankInfo("");
      alert("Cập nhật trạng thái thành công!");
      window.dispatchEvent(new Event("notificationUpdated"));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Cập nhật thất bại.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">Đang tải chi tiết đơn hàng...</div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-3">Không tìm thấy đơn hàng.</p>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate("/admin/orders")}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const shippingFee = 30000;
  const subtotal = order.items?.reduce(
    (sum, item) => sum + (item.variant?.price * item.quantity || 0),
    0
  ) || 0;
  const totalWithShipping = subtotal + shippingFee;

  return (
    <div className="container-fluid py-2">
      {/* Header + Back button */}
      <div className="mb-3 d-flex align-items-center gap-2">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate("/admin/orders")}
        >
          ← Quay lại
        </button>
        <h4 className="mb-0">Đơn hàng #{String(order._id).slice(-8).toUpperCase()}</h4>
      </div>

      <div className="row g-3">
        {/* Cột trái: Thông tin + Sản phẩm */}
        <div className="col-lg-8">
          {/* Thông tin khách */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">📍 Thông tin giao hàng</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="text-muted small">Tên khách</label>
                  <div className="fw-semibold">
                    {order.shippingAddress?.name || "—"}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Số điện thoại</label>
                  <div className="fw-semibold">
                    {order.shippingAddress?.phone || "—"}
                  </div>
                </div>
                <div className="col-12">
                  <label className="text-muted small">Địa chỉ</label>
                  <div>{order.shippingAddress?.address || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3">📦 Sản phẩm</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="small text-muted">
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Biến thể</th>
                      <th className="text-center">Số lượng</th>
                      <th className="text-end">Giá</th>
                      <th className="text-end">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="small fw-semibold">
                          {item.product?.name || "—"}
                        </td>
                        <td className="small text-muted">
                          {item.variant?.name || "—"}
                        </td>
                        <td className="small text-center">{item.quantity}</td>
                        <td className="small text-end">
                          {money(item.variant?.price || 0)}đ
                        </td>
                        <td className="small text-end fw-semibold">
                          {money((item.variant?.price || 0) * item.quantity)}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Tình trạng + Thanh toán */}
        <div className="col-lg-4">
          {/* Trạng thái */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">🔄 Trạng thái đơn hàng</h6>
              <div className="mb-3">
                <label className="text-muted small d-block mb-2">
                  Cập nhật trạng thái
                </label>
                <select
                  className={`form-select form-select-sm ${badgeClass(
                    order.status
                  )}`}
                  value={REVERSE_STATUS_MAP[order.status] || order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                >
                  <option value={REVERSE_STATUS_MAP[order.status]}>
                    {REVERSE_STATUS_MAP[order.status]} (hiện tại)
                  </option>
                  {getAllowedNextStatuses().map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="small text-muted">
                <div className="mb-2">
                  <strong>Ngày tạo:</strong>
                  <br />
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("vi-VN")
                    : "—"}
                </div>
                <div>
                  <strong>Thanh toán:</strong>
                  <br />
                  {order.paymentMethod || "—"}
                  {order.paymentStatus && (
                    <>
                      <br />
                      <span className="badge bg-info-subtle text-info mt-1">
                        {order.paymentStatus}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tóm tắt tiền */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3">💰 Tóm tắt thanh toán</h6>
              <div className="small">
                <div className="row g-2 mb-2">
                  <div className="col-6 text-muted">Tạm tính (sản phẩm)</div>
                  <div className="col-6 text-end fw-semibold">
                    {money(subtotal)}đ
                  </div>
                </div>
                <div className="row g-2 pb-3 border-bottom mb-2">
                  <div className="col-6 text-muted">Phí vận chuyển</div>
                  <div className="col-6 text-end">{money(shippingFee)}đ</div>
                </div>
                {order.discountAmount && (
                  <div className="row g-2 pb-2 mb-2">
                    <div className="col-6 text-muted">Giảm giá</div>
                    <div className="col-6 text-end">
                      -{money(order.discountAmount)}đ
                    </div>
                  </div>
                )}
                <div className="row g-2">
                  <div className="col-6 fw-bold">Tổng cộng</div>
                  <div className="col-6 text-end fw-bold text-primary">
                    {money(totalWithShipping)}đ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận chuyển đơn từ pending sang processing */}
      {showConfirmModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(15,23,42,.35)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0">
                <h5 className="modal-title">Xác nhận chuẩn bị hàng</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowConfirmModal(false)} 
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Bạn chắc chắn đơn hàng này có sẵn và sẽ chuẩn bị giao hàng?
                </p>
                <div className="alert alert-info small">
                  <strong>Lưu ý:</strong> Nếu sản phẩm không có sẵn, vui lòng chọn "Đã hủy" để từ chối đơn.
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={updating}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => confirmStatusChange("Đang xử lý")}
                  disabled={updating}
                >
                  {updating ? "Đang cập nhật..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal hoàn tiền */}
      {showRefundModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(15,23,42,.35)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0">
                <h5 className="modal-title">Thông tin hoàn tiền</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRefundModal(false)} 
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Khách hàng đã thanh toán. Vui lòng cung cấp thông tin hoàn tiền:
                </p>
                <div className="mb-3">
                  <label className="form-label small">Thông tin tài khoản ngân hàng (để hoàn tiền)</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="VD: Ngân hàng: Vietcombank&#10;Tên tài khoản: Nguyễn Văn A&#10;Số tài khoản: 1234567890"
                    value={bankInfo}
                    onChange={(e) => setBankInfo(e.target.value)}
                  />
                </div>
                <div className="alert alert-warning small">
                  <strong>Thông báo:</strong> Thông tin này sẽ được gửi đến khách hàng để họ biết cách nhận hoàn tiền.
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowRefundModal(false)}
                  disabled={updating}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => confirmStatusChange("Đã hủy")}
                  disabled={updating || !bankInfo.trim()}
                >
                  {updating ? "Đang xử lý..." : "Xác nhận hủy & gửi hoàn tiền"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
