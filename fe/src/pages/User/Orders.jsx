import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../services/http";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

// Reverse mapping: enum backend sang tiếng Việt (display)
const REVERSE_STATUS_MAP = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Hoàn trả",
};

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

export default function Orders() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [ratingModal, setRatingModal] = useState(null); // {orderId, productId}
  const [ratingForm, setRatingForm] = useState({ stars: 5, comment: "" });
  const [ratingErr, setRatingErr] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchOrders();
  }, [token, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await http.get("/shop/profile");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) {
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const openRatingModal = (orderId, productId) => {
    setRatingModal({ orderId, productId });
    setRatingForm({ stars: 5, comment: "" });
    setRatingErr("");
  };

  const closeRatingModal = () => {
    setRatingModal(null);
    setRatingForm({ stars: 5, comment: "" });
    setRatingErr("");
  };

  const submitRating = async (e) => {
    e.preventDefault();
    if (!ratingModal?.productId) return;

    setRatingErr("");
    setRatingLoading(true);

    try {
      await http.post(`/shop/products/${ratingModal.productId}/rate`, {
        stars: ratingForm.stars,
        comment: ratingForm.comment,
      });
      alert("Cảm ơn đánh giá của bạn!");
      closeRatingModal();
      fetchOrders();
    } catch (err) {
      console.error(err);
      setRatingErr(
        err?.response?.data?.message || "Đánh giá thất bại. Vui lòng thử lại."
      );
    } finally {
      setRatingLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await http.post(`/shop/orders/${orderId}/cancel`);
      alert("Hủy đơn hàng thành công!");
      window.dispatchEvent(new Event("cartUpdated"));
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Hủy đơn hàng thất bại. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return <div className="container py-5 text-muted text-center">Đang tải...</div>;
  }

  if (!orders.length) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h3 className="mb-3">Chưa có đơn hàng</h3>
          <p className="text-muted mb-4">Bạn chưa đặt hàng nào.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold mb-4">Lịch sử đơn hàng</h2>

      <div className="row g-3">
        {orders.map((order) => {
          const isExpanded = expandedId === order._id;
          return (
            <div key={order._id} className="col-12">
              <div className="card border-0 shadow-sm rounded-4">
                {/* Header */}
                <div
                  className="card-header border-0 d-flex justify-content-between align-items-center"
                  style={{ background: "#F9FAFF", cursor: "pointer" }}
                  onClick={() =>
                    setExpandedId(isExpanded ? null : order._id)
                  }
                >
                  <div>
                    <div className="small fw-semibold">
                      Đơn #{String(order._id).slice(-8).toUpperCase()}
                    </div>
                    <div className="small text-muted">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="text-end">
                      <div className="fw-bold">{money((order.items?.reduce((sum, item) => sum + (item.variant?.price * item.quantity || 0), 0) || 0) + 30000)}đ</div>
                      <span
                        className={`badge rounded-pill ${badgeClass(
                          order.status
                        )}`}
                      >
                        {REVERSE_STATUS_MAP[order.status] || order.status}
                      </span>
                    </div>

                    <div className="text-muted">
                      {isExpanded ? "▼" : "▶"}
                    </div>
                  </div>
                </div>

                {/* Details */}
                {isExpanded && (
                  <div className="card-body">
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="text-muted small">
                          Người nhận
                        </label>
                        <div className="fw-semibold">
                          {order.shippingAddress?.name}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="text-muted small">
                          Số điện thoại
                        </label>
                        <div className="fw-semibold">
                          {order.shippingAddress?.phone}
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="text-muted small">
                          Địa chỉ
                        </label>
                        <div>{order.shippingAddress?.address}</div>
                      </div>
                    </div>

                    <h6 className="mb-2 fw-bold">Sản phẩm</h6>
                    <div className="border rounded-3 p-2 mb-3">
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="d-flex justify-content-between align-items-start mb-2"
                        >
                          <div className="flex-grow-1">
                            <div className="small fw-semibold">
                              {item.product?.name || "—"}
                            </div>
                            <div className="text-muted small">
                              {item.variant?.name} ({item.variant?.unit})
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="small">
                              {item.quantity} × {money(item.variant?.price)}đ
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="small mb-3">
                      {(() => {
                        const shippingFee = 30000;
                        // Tính lại giá sản phẩm từ các item
                        const subtotal = order.items?.reduce(
                          (sum, item) => sum + (item.variant?.price * item.quantity || 0),
                          0
                        ) || 0;
                        const totalWithShipping = subtotal + shippingFee;
                        return (
                          <>
                            <div className="row g-2 mb-2">
                              <div className="col-6 text-muted">Tạm tính (sản phẩm)</div>
                              <div className="col-6 text-end fw-semibold">
                                {money(subtotal)}đ
                              </div>
                            </div>
                            <div className="row g-2 pb-3 border-bottom mb-2">
                              <div className="col-6 text-muted">Phí vận chuyển</div>
                              <div className="col-6 text-end">
                                {money(shippingFee)}đ
                              </div>
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
                          </>
                        );
                      })()}
                    </div>

                    <div className="border-top pt-3">
                      <div className="row g-2 small mb-3">
                        <div className="col-6">
                          <label className="text-muted">Thanh toán</label>
                          <div>{order.paymentMethod || "—"}</div>
                        </div>
                        <div className="col-6">
                          <label className="text-muted">Trạng thái</label>
                          <div>
                            <span
                              className={`badge rounded-pill ${badgeClass(
                                order.status
                              )}`}
                            >
                              {REVERSE_STATUS_MAP[order.status] || order.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nút thanh toán - chỉ hiện khi đơn "pending" và paymentMethod = "Online" */}
                      {order.status === "pending" && order.paymentMethod === "Online" && (
                        <div className="mb-3">
                          <button
                            className="btn btn-sm btn-primary me-2"
                            onClick={() => navigate(`/thanh-toan/${order._id}`)}
                          >
                            💳 Thanh toán ngay
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const confirmCancel = window.confirm(
                                "⚠️ Bạn có chắc muốn hủy đơn hàng này?\n\nNhững sản phẩm sẽ được trả lại giỏ hàng."
                              );
                              if (confirmCancel) {
                                cancelOrder(order._id);
                              }
                            }}
                          >
                            ✕ Hủy đơn
                          </button>
                        </div>
                      )}

                      {/* Nút hủy cho COD - pending hoặc processing */}
                      {order.status === "pending" && order.paymentMethod === "COD" && (
                        <div className="mb-3">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const confirmCancel = window.confirm(
                                "⚠️ Bạn có chắc muốn hủy đơn hàng này?\n\nNhững sản phẩm sẽ được trả lại giỏ hàng."
                              );
                              if (confirmCancel) {
                                cancelOrder(order._id);
                              }
                            }}
                          >
                            ✕ Hủy đơn
                          </button>
                        </div>
                      )}

                      {/* Nút hủy cho processing */}
                      {order.status === "processing" && (
                        <div className="mb-3">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const confirmCancel = window.confirm(
                                "⚠️ Bạn có chắc muốn hủy đơn hàng này?\n\nNhững sản phẩm sẽ được trả lại giỏ hàng."
                              );
                              if (confirmCancel) {
                                cancelOrder(order._id);
                              }
                            }}
                          >
                            ✕ Hủy đơn
                          </button>
                        </div>
                      )}

                      {/* Nút đánh giá - chỉ hiện khi đơn "completed" */}
                      {order.status === "completed" && (
                        <div className="d-flex gap-2">
                          {order.items?.map((item) => (
                            <button
                              key={item.product?._id}
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                openRatingModal(
                                  order._id,
                                  item.product?._id
                                )
                              }
                            >
                              ⭐ Đánh giá{" "}
                              {item.product?.name?.slice(0, 10)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ background: "rgba(15,23,42,.35)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0">
                <h5 className="modal-title">Đánh giá sản phẩm</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRatingModal}
                />
              </div>
              <form onSubmit={submitRating}>
                <div className="modal-body">
                  {ratingErr && (
                    <div className="alert alert-danger py-2 small mb-3">
                      {ratingErr}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small">Số sao</label>
                    <div className="d-flex gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`btn btn-lg p-0 ${
                            ratingForm.stars >= s
                              ? "text-warning"
                              : "text-secondary"
                          }`}
                          onClick={() =>
                            setRatingForm({ ...ratingForm, stars: s })
                          }
                          style={{ fontSize: 24 }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Bình luận</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={ratingForm.comment}
                      onChange={(e) =>
                        setRatingForm({
                          ...ratingForm,
                          comment: e.target.value,
                        })
                      }
                      placeholder="Chia sẻ trải nghiệm của bạn..."
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={closeRatingModal}
                    disabled={ratingLoading}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={ratingLoading}
                  >
                    {ratingLoading ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
