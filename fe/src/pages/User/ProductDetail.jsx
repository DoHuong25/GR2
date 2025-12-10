// src/pages/user/ProductDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Shop, rateProduct } from "../../services/shop";
import { http } from "../../services/http";

/* ====== small helpers ====== */
const Stars = ({ v = 0 }) => {
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  return (
    <span className="text-warning">
      {[...Array(full)].map((_, i) => (
        <i key={`f${i}`} className="bi bi-star-fill me-1" />
      ))}
      {half && <i className="bi bi-star-half me-1" />}
      {[...Array(5 - full - (half ? 1 : 0))].map((_, i) => (
        <i key={`e${i}`} className="bi bi-star me-1" />
      ))}
    </span>
  );
};

const money = (n = 0) => Number(n || 0).toLocaleString("vi-VN");

/* ====== main page ====== */
export default function ProductDetail() {
    const [myRating, setMyRating] = useState(null);
    const [canRate, setCanRate] = useState(false);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null); // product
  const [rel, setRel] = useState([]); // related
  const [qty, setQty] = useState(1);
  const [selIdx, setSelIdx] = useState(0); // selected variant index
  const [tab, setTab] = useState("desc"); // desc | reviews | ship
  const [loading, setLoading] = useState(true);

  const base =
    typeof import.meta !== "undefined" && import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:4000";

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const prod = await Shop.getProduct(id);
        if (!mounted) return;
        setP(prod);

        // Kiểm tra quyền đánh giá
        const token = localStorage.getItem("token");
        if (token) {
          try {
            // Gọi thử API đánh giá với method OPTIONS hoặc GET để backend trả về quyền
            // Ở đây giả lập: nếu đã có rating của mình thì không cho đánh giá nữa
            const userId = JSON.parse(atob(token.split(".")[1])).userId;
            const hasRated = prod.ratings?.some(r => r.userId === userId || r.userId?._id === userId);
            setMyRating(hasRated ? prod.ratings.find(r => r.userId === userId || r.userId?._id === userId) : null);
            // Nếu chưa đánh giá và có quyền (isVerifiedPurchase=true)
            const can = prod.ratings?.find(r => r.userId === userId || r.userId?._id === userId)?.isVerifiedPurchase === true;
            setCanRate(!hasRated && can);
          } catch {}
        }

        // Lấy tất cả, lọc liên quan:
        // Ưu tiên cùng chủng loại (type), sau đó cùng danh mục (category)
        const all = await Shop.getProducts({});
        const list = Array.isArray(all) ? all : [];

        let related = list.filter(
          (x) =>
            x._id !== prod._id &&
            x.type &&
            prod.type &&
            x.type === prod.type
        );

        if (related.length < 8) {
          const extra = list.filter(
            (x) =>
              x._id !== prod._id &&
              String(x.category?._id || x.category) ===
                String(prod.category?._id || prod.category) &&
              !related.some((r) => r._id === x._id)
          );
          related = related.concat(extra);
        }

        setRel(related.slice(0, 8));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  const price = useMemo(() => {
    if (!p) return 0;
    if (p.minPrice != null) return p.minPrice;
    return p?.variants?.[selIdx]?.price ?? p?.variants?.[0]?.price ?? 0;
  }, [p, selIdx]);

  const imgURL = (img) => (img ? `${base}${img}` : "/assets/ca-thu-nuong.jpg");

  const addToCart = async () => {
    console.log("🔵 addToCart called");
    try {
      const v = p?.variants?.[selIdx] || p?.variants?.[0];
      console.log("🔵 variant:", v);
      if (!v?._id) {
        console.log("❌ variant không có _id");
        toast.error("Sản phẩm không có biến thể hợp lệ.");
        return;
      }
      console.log("🔵 posting to /shop/cart with:", { productId: p._id, variantId: v._id, quantity: qty });
      const res = await http.post("/shop/cart", {
        productId: p._id,
        variantId: v._id,
        quantity: qty,
      });
      console.log("✓ Thêm vào giỏ thành công:", res.data);
      toast.success(`✓ Đã thêm ${qty} sản phẩm vào giỏ hàng!`, { 
        position: "top-right",
        autoClose: 2000
      });
      console.log("📢 Phát event cartUpdated");
      // Phát event để Header cập nhật cart count
      window.dispatchEvent(new Event("cartUpdated"));
      console.log("✅ Event đã phát xong");
    } catch (err) {
      console.error("❌ Lỗi thêm giỏ:", err);
      console.error("❌ Error details:", err.message, err.response?.data);
      toast.error("Không thêm được giỏ hàng. Hãy thử lại.");
    }
  };

  const buyNow = async () => {
    try {
      const v = p?.variants?.[selIdx] || p?.variants?.[0];
      if (!v?._id) {
        toast.error("Sản phẩm không có biến thể hợp lệ.");
        return;
      }
      await http.post("/shop/cart", {
        productId: p._id,
        variantId: v._id,
        quantity: qty,
      });
      navigate("/cart");
    } catch {
      toast.error("Không thể mua ngay. Hãy thử lại.");
    }
  };

  if (loading)
    return <div className="container py-5 text-muted">Đang tải…</div>;
  if (!p) return <div className="container py-5">Không tìm thấy sản phẩm.</div>;

  console.log("🔵 ProductDetail rendering, p =", p.name);

  return (
    <div className="container py-4">
      {/* 2 columns */}
      <div className="row g-4">
        {/* left: image */}
        <div className="col-lg-6">
          <div className="ratio ratio-4x3 rounded-4 shadow-sm overflow-hidden">
            <img
              src={imgURL(p.image)}
              alt={p.name}
              className="object-fit-cover w-100 h-100"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/assets/ca-thu-nuong.jpg";
              }}
            />
          </div>

          {Array.isArray(p.images) && p.images.length > 1 && (
            <div className="d-flex gap-2 mt-2">
              {p.images.map((im, i) => (
                <img
                  key={i}
                  src={imgURL(im)}
                  width={80}
                  height={80}
                  className="rounded border object-fit-cover"
                  onClick={() => {
                    // có thể set ảnh chính nếu muốn sau này
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* right: info */}
        <div className="col-lg-6">
          <h1 className="h3 fw-bold mb-2">{p.name}</h1>

          {/* 🆕 danh mục + chủng loại */}
          <div className="small text-muted mb-2">
            {p.category?.name && <span>{p.category.name}</span>}
            {p.category?.name && p.type && <span> · </span>}
            {p.type && <span>{p.type}</span>}
          </div>

          <div className="d-flex align-items-center gap-2 mb-2">
            <Stars v={p.avgRating || 4.5} />
            <span className="text-muted small">
              ({p.reviewCount || 0} đánh giá)
            </span>
          </div>

          <div className="fs-3 fw-bold text-primary mb-3">
            {money(price)}đ
          </div>

          <p className="text-muted">{p.description}</p>

          {Array.isArray(p.variants) && p.variants.length > 0 && (
            <div className="mb-3">
              <label className="small text-muted">
                Chọn loại / khối lượng
              </label>
              <select
                className="form-select"
                value={selIdx}
                onChange={(e) => setSelIdx(Number(e.target.value))}
              >
                {p.variants.map((v, i) => (
                  <option key={i} value={i}>
                    {v.name} — {money(v.price)}đ/{v.unit || "gói"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="d-flex align-items-center gap-2 mb-3">
            <label className="small text-muted mb-0">Số lượng</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Number(e.target.value || 1)))
              }
              className="form-control w-auto"
              style={{ maxWidth: 100 }}
            />
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary w-50 py-2" onClick={buyNow}>
              Mua ngay
            </button>
            <button
              className="btn btn-outline-primary w-50 py-2"
              onClick={addToCart}
            >
              Thêm vào giỏ
            </button>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-5">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === "desc" ? "active" : ""}`}
              onClick={() => setTab("desc")}
            >
              Mô tả chi tiết
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === "reviews" ? "active" : ""}`}
              onClick={() => setTab("reviews")}
            >
              Đánh giá
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === "ship" ? "active" : ""}`}
              onClick={() => setTab("ship")}
            >
              Vận chuyển & bảo quản
            </button>
          </li>
        </ul>

        <div className="border-start border-end border-bottom rounded-bottom p-3">
          {tab === "desc" && (
            <div className="text-secondary">
              {p.longDescription || (
                <>
                  <p>
                    Hải sản được chọn lọc tại bờ biển Hải Tiến, xử lý sạch và
                    đóng gói chuẩn lạnh. Hương vị tươi ngọt, phù hợp các món
                    nướng – áp chảo – kho – sốt cà chua.
                  </p>
                  <ul>
                    <li>Nguồn: {p.origin || "Hải Tiến, Thanh Hóa"}</li>
                    <li>
                      Bảo quản: 0–4°C trong 24–48h, hoặc cấp đông -18°C
                    </li>
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === "reviews" && (
            <div className="text-secondary">
              {/* Form đánh giá */}
              {canRate && (
                <form className="mb-3 border rounded p-3 bg-light" onSubmit={async e => {
                  e.preventDefault();
                  try {
                    await rateProduct(p._id, ratingStars, ratingComment);
                    toast.success("Đánh giá thành công!");
                    setCanRate(false);
                    setRatingComment("");
                    setRatingStars(5);
                    // Reload lại sản phẩm để hiển thị đánh giá mới
                    const prod = await Shop.getProduct(id);
                    setP(prod);
                  } catch (err) {
                    toast.error(err?.response?.data?.message || "Không thể đánh giá");
                  }
                }}>
                  <div className="mb-2">
                    <label className="form-label mb-1">Chọn số sao:</label>
                    <select className="form-select w-auto d-inline-block ms-2" value={ratingStars} onChange={e => setRatingStars(Number(e.target.value))}>
                      {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} ★</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <textarea className="form-control" placeholder="Nhận xét của bạn..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} required minLength={5} />
                  </div>
                  <button className="btn btn-primary" type="submit">Gửi đánh giá</button>
                </form>
              )}
              {/* Danh sách đánh giá */}
              {Array.isArray(p.ratings) && p.ratings.length > 0 ? (
                p.ratings.map((r, i) => (
                  <div key={i} className="border-bottom py-2">
                    <div className="d-flex justify-content-between">
                      <strong>{r.stars}★</strong>
                      <span className="small text-muted">
                        {r.isVerifiedPurchase ? "Đã mua" : ""}
                      </span>
                    </div>
                    <div className="small mt-1">{r.comment}</div>
                  </div>
                ))
              ) : (
                <div className="text-muted">Chưa có đánh giá.</div>
              )}
            </div>
          )}

          {tab === "ship" && (
            <div className="text-secondary">
              <p>
                Đơn hàng đóng gói lạnh, giao nhanh toàn quốc. Miễn phí bao bì
                bảo ôn.
              </p>
              <p>
                Thời gian giao trong khu vực Thanh Hóa: 2–6 giờ. Tỉnh khác:
                1–2 ngày.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* related */}
      <section className="mt-5">
        <h3 className="h5 fw-bold mb-3">Sản phẩm liên quan</h3>
        {rel.length === 0 ? (
          <div className="text-muted">Chưa có gợi ý.</div>
        ) : (
          <div className="row g-3">
            {rel.map((r) => (
              <div key={r._id} className="col-6 col-md-3">
                <Link
                  to={`/san-pham/${r._id}`}
                  className="text-decoration-none text-dark"
                >
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="ratio ratio-4x3">
                      <img
                        src={imgURL(r.image)}
                        alt={r.name}
                        className="object-fit-cover rounded-top-4"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/assets/ca-thu-nuong.jpg";
                        }}
                      />
                    </div>
                    <div className="card-body">
                      <div className="small text-truncate mb-1">
                        {r.name}
                      </div>
                      <div className="small text-primary fw-semibold">
                        {money(r.minPrice ?? r?.variants?.[0]?.price)}đ
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
