import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../../services/http";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

function badgeClass(status) {
  switch (status) {
    case "Hoàn thành":
      return "bg-success-subtle text-success";
    case "Đang xử lý":
    case "Đang giao hàng":
    case "Chờ thanh toán":
      return "bg-primary-subtle text-primary";
    case "Đã hủy":
    case "Hoàn trả":
      return "bg-danger-subtle text-danger";
    default:
      return "bg-secondary-subtle text-secondary";
  }
}

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const ALL_STATUSES = [
    "Đang xử lý",
    "Đang giao hàng",
    "Hoàn thành",
    "Đã hủy",
    "Hoàn trả",
    "Chờ thanh toán",
  ];

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

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === order.status) return;

    setUpdating(true);
    try {
      const res = await http.put(`/admin/orders/${orderId}/status`, {
        status: newStatus,
      });
      setOrder(res.data);
      alert("Cập nhật trạng thái thành công!");
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
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                >
                  {ALL_STATUSES.map((s) => (
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
    </div>
  );
}
