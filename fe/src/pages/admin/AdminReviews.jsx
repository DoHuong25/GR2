// src/pages/admin/AdminReviews.jsx
import { useEffect, useState } from "react";
import { http } from "../../services/http";

export default function AdminReviews() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [q, setQ] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  const [minStars, setMinStars] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState(""); // "", "yes", "no"

  // lấy danh sách sản phẩm
  const fetchProducts = async (keyword = "") => {
    setLoadingProducts(true);
    try {
      const res = await http.get("/admin/products", {
        params: keyword ? { q: keyword } : {},
      });
      const list = res.data || [];
      setProducts(list);
      // nếu chưa chọn sp thì chọn cái đầu
      if (!selectedProduct && list.length > 0) {
        setSelectedProduct(list[0]);
      }
    } catch (e) {
      console.error("Lỗi load products", e);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // load products lần đầu
  useEffect(() => {
    fetchProducts();
  }, []);

  // lấy rating của 1 sản phẩm
  const fetchRatings = async (product) => {
    if (!product?._id) return;
    setLoadingRatings(true);
    try {
      const params = {};
      if (minStars) params.minStars = minStars;
      if (verifiedFilter === "yes") params.isVerified = "true";
      else if (verifiedFilter === "no") params.isVerified = "false";

      const res = await http.get(`/admin/products/${product._id}/ratings`, {
        params,
      });

      setSelectedProduct(res.data?.product || product);
      setRatings(res.data?.ratings || []);
    } catch (e) {
      console.error("Lỗi load ratings", e);
      setRatings([]);
    } finally {
      setLoadingRatings(false);
    }
  };

  // mỗi khi đổi sản phẩm / filter -> load lại đánh giá
  useEffect(() => {
    if (selectedProduct?._id) {
      fetchRatings(selectedProduct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?._id, minStars, verifiedFilter]);

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
  };

  const handleDeleteRating = async (ratingId) => {
    if (!selectedProduct?._id || !ratingId) return;
    if (!window.confirm("Bạn chắc chắn muốn xóa đánh giá này?")) return;

    try {
      await http.delete(
        `/admin/products/${selectedProduct._id}/ratings/${ratingId}`
      );
      setRatings((prev) => prev.filter((r) => r._id !== ratingId));
    } catch (e) {
      console.error("Xóa đánh giá lỗi", e);
      alert(e?.response?.data?.message || "Xóa đánh giá thất bại.");
    }
  };

  return (
    <div className="row g-3">
      {/* Cột trái: danh sách sản phẩm */}
      <div className="col-lg-5">
        <div className="card border-0 shadow-sm rounded-4 h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">Sản phẩm</h5>
                <small className="text-muted">
                  {products.length} sản phẩm có thể xem đánh giá
                </small>
              </div>
              <form
                className="d-flex"
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchProducts(q);
                }}
              >
                <input
                  className="form-control form-control-sm"
                  style={{ width: 200 }}
                  placeholder="Tìm theo tên…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn btn-sm btn-outline-primary ms-2">
                  Tìm
                </button>
              </form>
            </div>

            <div className="table-responsive" style={{ maxHeight: 460 }}>
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th className="text-end">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-muted">
                        Đang tải…
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-muted">
                        Chưa có sản phẩm.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const active = selectedProduct?._id === p._id;
                      return (
                        <tr
                          key={p._id}
                          className={active ? "table-primary" : ""}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSelectProduct(p)}
                        >
                          <td className="small text-truncate">
                            {p.name}
                          </td>
                          <td className="small text-end">
                            {(p.reviewCount ?? p.ratings?.length ?? 0) || 0} đánh
                            giá
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Cột phải: danh sách đánh giá của sản phẩm đang chọn */}
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm rounded-4 h-100">
          <div className="card-body d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">
                  Đánh giá{" "}
                  {selectedProduct ? `– ${selectedProduct.name}` : ""}
                </h5>
                {selectedProduct && (
                  <small className="text-muted">
                    Có {ratings.length} đánh giá (theo bộ lọc)
                  </small>
                )}
              </div>

              {/* filter sao + verified */}
              <div className="d-flex gap-2">
                <select
                  className="form-select form-select-sm"
                  value={minStars}
                  onChange={(e) => setMinStars(e.target.value)}
                >
                  <option value="">Tất cả sao</option>
                  <option value="4">Từ 4★</option>
                  <option value="3">Từ 3★</option>
                  <option value="2">Từ 2★</option>
                  <option value="1">Từ 1★</option>
                </select>

                <select
                  className="form-select form-select-sm"
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="yes">Đã mua hàng</option>
                  <option value="no">Chưa xác thực</option>
                </select>
              </div>
            </div>

            {/* danh sách đánh giá */}
            <div
              className="border rounded-3 p-2"
              style={{ background: "#F9FAFF", flex: 1, overflowY: "auto" }}
            >
              {loadingRatings ? (
                <div className="text-center text-muted py-4">
                  Đang tải đánh giá…
                </div>
              ) : !selectedProduct ? (
                <div className="text-muted py-4 text-center">
                  Chọn 1 sản phẩm ở bên trái để xem đánh giá.
                </div>
              ) : ratings.length === 0 ? (
                <div className="text-muted py-4 text-center">
                  Sản phẩm này chưa có đánh giá phù hợp bộ lọc.
                </div>
              ) : (
                ratings.map((r) => (
                  <div
                    key={r._id}
                    className="bg-white rounded-3 p-2 mb-2 d-flex justify-content-between align-items-start"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong>
                          {r.stars}★
                        </strong>
                        {r.userId && (
                          <span className="small text-muted">
                            {r.userId.username}
                          </span>
                        )}
                        {r.isVerifiedPurchase && (
                          <span className="badge bg-success-subtle text-success border-0 small">
                            Đã mua
                          </span>
                        )}
                      </div>
                      <div className="small">
                        {r.comment || <span className="text-muted">Không có nội dung.</span>}
                      </div>
                      <div className="small text-muted mt-1">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString("vi-VN")
                          : ""}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteRating(r._id)}
                    >
                      Xóa
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
