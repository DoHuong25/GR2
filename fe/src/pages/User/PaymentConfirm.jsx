import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { http } from "../../services/http";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

// Thông tin chuyển khoản
const BANK_INFO = {
  accountNumber: "3225393939",
  bank: "TechcomBank",
  accountName: "ĐỖ LƯỜNG HƯƠNG",
};

export default function PaymentConfirm() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await http.get(`/shop/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin đơn hàng.");
      setTimeout(() => navigate("/orders"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    setConfirming(true);
    try {
      const res = await http.post(`/shop/orders/${orderId}/confirm-payment`);
      toast.success("✓ Xác nhận thanh toán thành công! Admin sẽ kiểm tra trong 2-4 giờ.");
      // Phát event để Header cập nhật cart count
      window.dispatchEvent(new Event("cartUpdated"));
      setTimeout(() => navigate("/orders"), 2500);
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Lỗi xác nhận thanh toán. Vui lòng thử lại.";
      toast.error(errMsg);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    
    // Dialog xác nhận chi tiết
    const confirmed = window.confirm(
      "⚠️ Bạn có chắc muốn hủy đơn hàng này?\n\n" +
      "Sản phẩm sẽ được trả lại vào giỏ hàng của bạn.\n" +
      "Hành động này không thể hoàn tác."
    );
    
    if (!confirmed) return;
    
    setCancelling(true);
    try {
      const res = await http.post(`/shop/orders/${orderId}/cancel`);
      toast.success("✓ Đơn hàng đã được hủy. Sản phẩm trả lại giỏ hàng.");
      // Phát event để Header cập nhật cart count
      window.dispatchEvent(new Event("cartUpdated"));
      // Sau khi hủy trả về giỏ hàng
      setTimeout(() => navigate('/cart'), 1500);
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.message || 'Hủy đơn thất bại. Vui lòng thử lại.';
      toast.error(errMsg);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="container py-5 text-center text-muted">Đang tải...</div>;
  }

  if (!order) {
    return (
      <div className="container py-5 text-center">
        <h3>Không tìm thấy đơn hàng</h3>
        <Link to="/orders" className="btn btn-primary mt-3">Quay lại</Link>
      </div>
    );
  }

  // Hiển thị trang thanh toán chỉ khi paymentMethod là "Online"
  if (order.paymentMethod !== "Online") {
    return (
      <div className="container py-5 text-center">
        <h3>✓ Đặt hàng thành công!</h3>
        <p className="text-muted mt-3">Đơn hàng của bạn: <strong>{orderId}</strong></p>
        <Link to="/orders" className="btn btn-primary mt-3">Xem đơn hàng</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        {/* Cột trái: Thông tin đơn hàng */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">📦 Thông tin đơn hàng</h5>

              <div className="mb-3">
                <small className="text-muted">Mã đơn hàng:</small>
                <div className="fw-semibold">{orderId}</div>
              </div>

              <div className="mb-3">
                <small className="text-muted">Trạng thái:</small>
                <div>
                  <span className="badge bg-warning text-dark">
                    {order.paymentStatus === "Chưa thanh toán" ? "⏳ Chưa thanh toán" : "Chờ xác nhận"}
                  </span>
                </div>
              </div>

              <div className="border-top pt-3">
                <h6 className="fw-bold mb-2">Chi tiết sản phẩm:</h6>
                <div className="small">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                      <span>{item.product?.name}</span>
                      <span className="fw-semibold">{money(item.variant?.price * item.quantity)}đ</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-top pt-3 mt-3">
                {(() => {
                  // order.total đã bao gồm phí vận chuyển (30k)
                  // Tạm tính = order.total - 30000
                  const shippingFee = 30000;
                  const subtotal = order.total - shippingFee;
                  return (
                    <>
                      <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                        <span className="text-muted fw-semibold">Tạm tính (sản phẩm):</span>
                        <span className="fw-bold">{money(subtotal)}đ</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3">
                        <span className="text-muted">Phí vận chuyển:</span>
                        <span className="text-muted">{money(shippingFee)}đ</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">Tổng cộng:</span>
                        <span className="fw-bold text-primary fs-5">{money(order.total)}đ</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin chuyển khoản */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body">
              <h5 className="fw-bold mb-3">💳 Thông tin chuyển khoản</h5>

              <div className="alert alert-info p-3 rounded-3 small">
                <h6 className="fw-bold mb-3">Vui lòng chuyển khoản theo thông tin sau:</h6>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Số tài khoản:</div>
                  <div className="fw-semibold d-flex justify-content-between align-items-center">
                    <span>{BANK_INFO.accountNumber}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info py-0 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(BANK_INFO.accountNumber);
                        toast.success("✓ Đã sao chép STK!");
                      }}
                    >
                      Sao chép
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Ngân hàng:</div>
                  <div className="fw-semibold">{BANK_INFO.bank}</div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small mb-1">Chủ tài khoản:</div>
                  <div className="fw-semibold">{BANK_INFO.accountName}</div>
                </div>

                <div className="border-top pt-3">
                  <div className="text-muted small mb-1">Số tiền:</div>
                  <div className="fw-bold text-danger fs-5 d-flex justify-content-between align-items-center">
                    <span>{money(order.total)}đ</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(order.total.toString());
                        toast.success("✓ Đã sao chép số tiền!");
                      }}
                    >
                      Sao chép
                    </button>
                  </div>
                </div>

                <div className="border-top pt-3">
                  <div className="text-muted small mb-1">Nội dung chuyển khoản:</div>
                  <div className="fw-semibold small d-flex justify-content-between align-items-center">
                    <span className="text-break">Thanh toan don hang {orderId}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info py-0 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`Thanh toan don hang ${orderId}`);
                        toast.success("✓ Đã sao chép nội dung!");
                      }}
                    >
                      Sao chép
                    </button>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning p-3 rounded-3 small mb-3">
                <strong>⚠️ Lưu ý:</strong>
                <ul className="mb-0 mt-2">
                  <li>Vui lòng chuyển đúng số tiền và nội dung</li>
                  <li>Sau khi chuyển khoản, nhấn nút "Đã thanh toán"</li>
                  <li>Admin sẽ kiểm tra và xác nhận trong vòng 2-4 giờ</li>
                </ul>
              </div>

              <button
                className="btn btn-primary w-100 py-2 fw-bold"
                onClick={handleConfirmPayment}
                disabled={confirming}
              >
                {confirming ? "Đang xử lý..." : "✓ Đã thanh toán"}
              </button>

              <button
                className="btn btn-outline-danger w-100 py-2 fw-bold mt-2"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Đang xử lý..." : "✕ Hủy đơn hàng"}
              </button>

              <div className="text-center mt-3">
                <Link to="/orders" className="text-decoration-none small">
                  Quay lại lịch sử đơn hàng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
