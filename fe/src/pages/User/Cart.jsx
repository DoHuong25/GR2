import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { http } from "../../services/http";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({}); // Track checked items
  const [checkoutData, setCheckoutData] = useState({
    name: "",
    phone: "",
    address: "",
    paymentMethod: "COD",
  });
  const [checking, setChecking] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCart();
  }, []);

  useEffect(() => {
    // Lắng nghe event khi có sản phẩm được thêm vào giỏ từ trang khác
    const handleCartUpdated = () => {
      fetchCart();
    };
    window.addEventListener("cartUpdated", handleCartUpdated);
    return () => window.removeEventListener("cartUpdated", handleCartUpdated);
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await http.get("/shop/cart");
      const cartData = res.data || { items: [], total: 0 };
      setCart(cartData);
      // Mặc định chọn tất cả sản phẩm
      const allSelected = {};
      cartData.items?.forEach((_, idx) => {
        allSelected[idx] = true;
      });
      setSelectedItems(allSelected);
    } catch (err) {
      console.error(err);
      setCart({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (index, newQty) => {
    if (newQty <= 0) return;
    try {
      const res = await http.put("/shop/cart", { itemIndex: index, quantity: newQty });
      setCart(res.data.cart);
      toast.success("Cập nhật số lượng thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật giỏ hàng thất bại.");
    }
  };

  const removeItem = async (index) => {
    try {
      const res = await http.delete(`/shop/cart/${index}`);
      setCart(res.data.cart);
      // Reset checkbox khi xóa item (để avoid index mismatch)
      const newSelected = {};
      res.data.cart.items?.forEach((_, idx) => {
        // Nếu xóa item ở giữa, các item sau sẽ dịch lên
        if (idx < index) {
          newSelected[idx] = selectedItems[idx] || false;
        } else {
          newSelected[idx] = selectedItems[idx + 1] || false;
        }
      });
      setSelectedItems(newSelected);
      toast.success("Xóa sản phẩm thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Xóa sản phẩm thất bại.");
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutErr("");

    if (!token) {
      alert("Vui lòng đăng nhập trước khi đặt hàng.");
      navigate("/login");
      return;
    }

    if (!checkoutData.name || !checkoutData.phone || !checkoutData.address) {
      setCheckoutErr("Vui lòng nhập đầy đủ thông tin giao hàng.");
      return;
    }

    // Kiểm tra có sản phẩm được chọn không
    const hasSelected = Object.values(selectedItems).some(v => v);
    if (!hasSelected) {
      setCheckoutErr("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }

    setChecking(true);
    try {
      // Nếu là Chuyển khoản: tạo đơn trước rồi hiển thị trang thanh toán với mã đơn hàng
      const res = await http.post("/shop/checkout", {
        name: checkoutData.name,
        phone: checkoutData.phone,
        address: checkoutData.address,
        paymentMethod: checkoutData.paymentMethod,
        selectedItems: selectedItems, // Gửi danh sách sản phẩm được chọn
      });

      const { orderId, paymentMethod, total } = res.data;

      if (paymentMethod === "Online") {
        // Redirect đến trang thanh toán cho phương thức online (hiển thị STK, nội dung là mã đơn)
        toast.success("Đặt hàng thành công. Chuyển sang trang thanh toán...");
        // Phát event để Header cập nhật cart count
        window.dispatchEvent(new Event("cartUpdated"));
        navigate(`/thanh-toan/${orderId}`);
        return;
      }

      // Nếu COD: thông báo chờ phê duyệt và chuyển đến lịch sử đơn
      toast.success("Đặt hàng thành công! Đơn COD đang chờ phê duyệt.");
      // Phát event để Header cập nhật cart count
      window.dispatchEvent(new Event("cartUpdated"));
      setCart({ items: [], total: 0 });
      navigate("/orders");
    } catch (err) {
      console.error(err);
      setCheckoutErr(
        err?.response?.data?.message || "Đặt hàng thất bại. Vui lòng thử lại."
      );
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <div className="container py-5 text-muted text-center">Đang tải giỏ hàng...</div>;
  }

  console.log('[CART] cart state:', cart);
  console.log('[CART] cart.items:', cart?.items);
  console.log('[CART] selectedItems:', selectedItems);

  if (!cart?.items?.length) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h3 className="mb-3">Giỏ hàng trống</h3>
          <p className="text-muted mb-4">
            Bạn chưa thêm sản phẩm nào vào giỏ hàng.
          </p>
          <Link to="/san-pham" className="btn btn-primary">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold mb-4">Giỏ hàng</h2>

      <div className="row g-4">
        {/* Cột trái: danh sách sản phẩm */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light small text-muted">
                    <tr>
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={Object.values(selectedItems).every(v => v)}
                          onChange={(e) => {
                            const allChecked = e.target.checked;
                            const newSelected = {};
                            cart.items?.forEach((_, idx) => {
                              newSelected[idx] = allChecked;
                            });
                            setSelectedItems(newSelected);
                          }}
                        />
                      </th>
                      <th>Sản phẩm</th>
                      <th>Giá</th>
                      <th>Số lượng</th>
                      <th className="text-end">Thành tiền</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart?.items?.map((item, idx) => {
                      const lineTotal = item.variant.price * item.quantity;
                      const isSelected = selectedItems[idx] || false;
                      return (
                        <tr key={idx} style={{ backgroundColor: isSelected ? 'rgba(0,123,255,0.05)' : 'transparent' }}>
                          <td style={{ width: 40 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedItems({
                                  ...selectedItems,
                                  [idx]: e.target.checked,
                                });
                              }}
                            />
                          </td>
                          <td className="small">
                            <div className="fw-semibold">
                              {item.product.name}
                            </div>
                            <div className="text-muted">
                              {item.variant.name} ({item.variant.unit})
                            </div>
                          </td>
                          <td className="small">
                            {money(item.variant.price)}đ
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(
                                  idx,
                                  Math.max(1, Number(e.target.value || 1))
                                )
                              }
                              className="form-control form-control-sm"
                              style={{ maxWidth: 80 }}
                            />
                          </td>
                          <td className="small text-end fw-semibold">
                            {money(lineTotal)}đ
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem(idx)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Link to="/san-pham" className="btn btn-outline-secondary mt-3">
            ← Tiếp tục mua sắm
          </Link>
        </div>

        {/* Cột phải: tóm tắt & form checkout */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body">
              <h6 className="mb-3 fw-bold">Tóm tắt đơn hàng</h6>

              {(() => {
                const subtotal = cart.items?.reduce((sum, item, idx) => {
                  if (selectedItems[idx]) {
                    return sum + item.variant.price * item.quantity;
                  }
                  return sum;
                }, 0) || 0;
                const shippingFee = 30000; // Phí vận chuyển cố định 30.000đ
                const total = subtotal + shippingFee;

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
                      <span className="fw-bold text-primary fs-5">{money(total)}đ</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Form checkout */}
          <form onSubmit={handleCheckout} className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h6 className="mb-3 fw-bold">Thông tin giao hàng</h6>

              {checkoutErr && (
                <div className="alert alert-danger py-2 small mb-3">
                  {checkoutErr}
                </div>
              )}

              <div className="mb-2">
                <label className="form-label small">Tên người nhận</label>
                <input
                  className="form-control form-control-sm"
                  value={checkoutData.name}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label small">Số điện thoại</label>
                <input
                  className="form-control form-control-sm"
                  value={checkoutData.phone}
                  onChange={(e) =>
                    setCheckoutData({
                      ...checkoutData,
                      phone: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label small">Địa chỉ giao hàng</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={checkoutData.address}
                  onChange={(e) =>
                    setCheckoutData({
                      ...checkoutData,
                      address: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small">Phương thức thanh toán</label>
                <select
                  className="form-select form-select-sm"
                  value={checkoutData.paymentMethod}
                  onChange={(e) =>
                    setCheckoutData({
                      ...checkoutData,
                      paymentMethod: e.target.value,
                    })
                  }
                >
                  <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                  <option value="Online">Chuyển khoản trực tuyến</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={checking}
              >
                {checking ? "Đang xử lý..." : "Đặt hàng ngay"}
              </button>

              {!token && (
                <div className="alert alert-warning py-2 small mt-3 mb-0">
                  <Link to="/login">Đăng nhập</Link> để đặt hàng
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
