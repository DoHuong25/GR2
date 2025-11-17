// src/pages/user/ProductDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Shop } from "../../services/shop";
import { http } from "../../services/http";

/* ====== small helpers ====== */
const Stars = ({ v = 0 }) => {
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  return (
    <span className="text-warning">
      {[...Array(full)].map((_, i) => <i key={`f${i}`} className="bi bi-star-fill me-1" />)}
      {half && <i className="bi bi-star-half me-1" />}
      {[...Array(5 - full - (half ? 1 : 0))].map((_, i) => <i key={`e${i}`} className="bi bi-star me-1" />)}
    </span>
  );
};

const money = (n = 0) => Number(n || 0).toLocaleString("vi-VN");

/* ====== main page ====== */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);          // product
  const [rel, setRel] = useState([]);        // related
  const [qty, setQty] = useState(1);
  const [selIdx, setSelIdx] = useState(0);   // selected variant index
  const [tab, setTab] = useState("desc");    // desc | reviews | ship
  const [loading, setLoading] = useState(true);

  // base URL ảnh BE
  const base =
    (typeof import.meta !== "undefined" && import.meta.env.VITE_API_URL)
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

        // lấy related cùng danh mục
        const all = await Shop.getProducts({});
        const related = (Array.isArray(all) ? all : []).filter(
          (x) => x._id !== prod._id && String(x.category) === String(prod.category)
        ).slice(0, 8);
        setRel(related);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  // giá theo variant
  const price = useMemo(() => {
    if (!p) return 0;
    if (p.minPrice != null) return p.minPrice;
    return p?.variants?.[selIdx]?.price ?? p?.variants?.[0]?.price ?? 0;
  }, [p, selIdx]);

  const imgURL = (img) => (img ? `${base}${img}` : "/assets/ca-thu-nuong.jpg");

  const addToCart = async () => {
    try {
      await http.post("/shop/cart", {
        productId: p._id,
        quantity: qty,
        variant: p?.variants?.[selIdx]?.name || "",
      });
      alert("Đã thêm vào giỏ!");
    } catch {
      alert("Không thêm được giỏ hàng. Hãy thử lại.");
    }
  };
  const buyNow = async () => {
    try {
      await http.post("/shop/cart", {
        productId: p._id,
        quantity: qty,
        variant: p?.variants?.[selIdx]?.name || "",
     });
      navigate("/cart"); 
    } catch {
      alert("Không thể mua ngay. Hãy thử lại.");
    }
  };
  if (loading) return <div className="container py-5 text-muted">Đang tải…</div>;
  if (!p) return <div className="container py-5">Không tìm thấy sản phẩm.</div>;

  return (
    <div className="container py-4">
      {/* breadcrumb */}
      

      {/* 2 columns */}
      <div className="row g-4">
        {/* left: image + thumbs */}
        <div className="col-lg-6">
          <div className="ratio ratio-4x3 rounded-4 shadow-sm overflow-hidden">
            <img
              src={imgURL(p.image)}
              alt={p.name}
              className="object-fit-cover w-100 h-100"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/ca-thu-nuong.jpg"; }}
            />
          </div>

          {/* thumbs (nếu có nhiều ảnh sau này) */}
          {Array.isArray(p.images) && p.images.length > 1 && (
            <div className="d-flex gap-2 mt-2">
              {p.images.map((im, i) => (
                <img key={i} src={imgURL(im)} width={80} height={80}
                     className="rounded border object-fit-cover"
                     onClick={() => {/* có thể set ảnh chính nếu muốn */}} />
              ))}
            </div>
          )}
        </div>

        {/* right: info */}
        <div className="col-lg-6">
          <h1 className="h3 fw-bold mb-2">{p.name}</h1>
          <div className="d-flex align-items-center gap-2 mb-2">
            <Stars v={p.avgRating || 4.5} />
            <span className="text-muted small">({p.reviewCount || 0} đánh giá)</span>
          </div>

          <div className="fs-3 fw-bold text-primary mb-3">{money(price)}đ</div>

          <p className="text-muted">{p.description}</p>

          {/* variants */}
          {Array.isArray(p.variants) && p.variants.length > 0 && (
            <div className="mb-3">
              <label className="small text-muted">Chọn loại / khối lượng</label>
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

          {/* qty */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <label className="small text-muted mb-0">Số lượng</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              className="form-control w-auto"
              style={{ maxWidth: 100 }}
            />
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary w-50 py-2" onClick={buyNow}>
               Mua ngay
            </button>
            <button className="btn btn-outline-primary w-50 py-2" onClick={addToCart}>
              Thêm vào giỏ
            </button>
          </div>         
        </div>
      </div>

      {/* tabs */}
      <div className="mt-5">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button className={`nav-link ${tab === "desc" ? "active" : ""}`} onClick={() => setTab("desc")}>
              Mô tả chi tiết
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${tab === "reviews" ? "active" : ""}`} onClick={() => setTab("reviews")}>
              Đánh giá
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${tab === "ship" ? "active" : ""}`} onClick={() => setTab("ship")}>
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
                    Hải sản được chọn lọc tại bờ biển Hải Tiến, xử lý sạch và đóng gói chuẩn lạnh.
                    Hương vị tươi ngọt, phù hợp các món nướng – áp chảo – kho – sốt cà chua.
                  </p>
                  <ul>
                    <li>Nguồn: {p.origin || "Hải Tiến, Thanh Hóa"}</li>
                    <li>Bảo quản: 0–4°C trong 24–48h, hoặc cấp đông -18°C</li>
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === "reviews" && (
            <div className="text-secondary">
              {Array.isArray(p.ratings) && p.ratings.length > 0 ? (
                p.ratings.map((r, i) => (
                  <div key={i} className="border-bottom py-2">
                    <div className="d-flex justify-content-between">
                      <strong>{r.stars}★</strong>
                      <span className="small text-muted">{r.isVerifiedPurchase ? "Đã mua" : ""}</span>
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
              <p>Đơn hàng đóng gói lạnh, giao nhanh toàn quốc. Miễn phí bao bì bảo ôn.</p>
              <p>Thời gian giao trong khu vực Thanh Hóa: 2–6 giờ. Tỉnh khác: 1–2 ngày.</p>
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
                <Link to={`/san-pham/${r._id}`} className="text-decoration-none text-dark">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="ratio ratio-4x3">
                      <img
                        src={imgURL(r.image)}
                        alt={r.name}
                        className="object-fit-cover rounded-top-4"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/ca-thu-nuong.jpg"; }}
                      />
                    </div>
                    <div className="card-body">
                      <div className="small text-truncate mb-1">{r.name}</div>
                      <div className="small text-primary fw-semibold">{money(r.minPrice ?? r?.variants?.[0]?.price)}đ</div>
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
