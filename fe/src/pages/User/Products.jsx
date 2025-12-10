// src/pages/user/Products.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Shop } from "../../services/shop";
import { http } from "../../services/http";

/* ====== UI nhỏ ====== */
const Stars = ({ v = 4 }) => {
  const n = Math.max(0, Math.min(5, Math.round(v)));
  return (
    <span className="text-warning">
      {Array.from({ length: 5 }).map((_, i) => (i < n ? "★" : "☆"))}
    </span>
  );
};

const SkeletonCard = () => (
  <div className="card border-0 rounded-4 shadow-sm placeholder-glow h-100">
    <div className="ratio ratio-4x3 rounded-top-4 bg-light placeholder" />
    <div className="card-body">
      <div className="placeholder col-9 mb-2" />
      <div className="placeholder col-5" />
    </div>
  </div>
);

function ProductCard({ p }) {
  const navigate = useNavigate();

  const base =
    typeof import.meta !== "undefined" && import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:4000";

  const img = p?.image ? `${base}${p.image}` : "/assets/ca-thu-nuong.jpg";
  const price = p?.minPrice ?? p?.variants?.[0]?.price ?? 0;

  const addToCart = async (goCart = false) => {
    try {
      const v = p?.variants?.[0];
      if (!v?._id) {
        toast.error("Sản phẩm không có biến thể hợp lệ.");
        return;
      }
      await http.post("/shop/cart", {
        productId: p._id,
        variantId: v._id,
        quantity: 1,
      });
      toast.success("✓ Đã thêm vào giỏ hàng!", { position: "top-right", autoClose: 2000 });
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      toast.error("Không thêm được giỏ hàng. Vui lòng thử lại.");
      return;
    }
    if (goCart) navigate("/cart");
  };

  return (
    <div className="card h-100 border-0 shadow-sm rounded-4">
      <Link to={`/san-pham/${p._id}`} className="text-decoration-none">
        <div className="ratio ratio-4x3">
          <img
            src={img}
            alt={p?.name}
            className="object-fit-cover rounded-top-4"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/assets/ca-thu-nuong.jpg";
            }}
          />
        </div>
      </Link>

      <div className="card-body text-center">
        <Link
          to={`/san-pham/${p._id}`}
          className="text-decoration-none text-dark"
        >
          <h6 className="mb-1 text-truncate" title={p?.name}>
            {p?.name}
          </h6>
        </Link>
        <div className="small text-muted mb-3">
          {price.toLocaleString("vi-VN")}đ
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-primary btn-sm w-50"
            onClick={() => addToCart(true)}
          >
            Mua ngay
          </button>
          <button
            className="btn btn-outline-primary btn-sm w-50"
            onClick={() => addToCart(false)}
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}

/* Trang Sản phẩm  */
export default function Products() {
  const [params, setParams] = useSearchParams();

  const [cats, setCats] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  const qParam = (params.get("q") || "").trim();
  const categoryParam = params.get("category") || "";
  const priceParam = params.get("price") || "";
  const sortParam = params.get("sort") || "";
  const typeParam = params.get("type") || ""; // 🆕
  const pageParam = Math.max(1, Number(params.get("page") || 1));

  const [q, setQ] = useState(qParam);
  const [category, setCategory] = useState(categoryParam);
  const [price, setPrice] = useState(priceParam);
  const [sort, setSort] = useState(sortParam);
  const [type, setType] = useState(typeParam); // 🆕

  useEffect(() => {
    setQ(qParam);
    setCategory(categoryParam);
    setPrice(priceParam);
    setSort(sortParam);
    setType(typeParam); // 🆕
  }, [qParam, categoryParam, priceParam, sortParam, typeParam]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cs, ps] = await Promise.all([
          Shop.getCategories(),
          Shop.getProducts({}),
        ]);
        setCats(Array.isArray(cs) ? cs : cs?.categories || []);
        setAll(Array.isArray(ps) ? ps : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categoryOptions = useMemo(() => {
    const names = ["Hải sản Tươi", "Hải sản Khô", "Hải sản Đông lạnh"];
    const norm = (s) => s?.normalize("NFC")?.toLowerCase();
    const safe = Array.isArray(cats) ? cats : [];
    const three = names.map(
      (n) => safe.find((c) => norm(c?.name) === norm(n)) || { name: n }
    );
    return [{ value: "", label: "Tất cả" }].concat(
      three.map((c, i) => ({ value: c._id || "", label: names[i] }))
    );
  }, [cats]);

  // 🆕 danh sách chủng loại (type) lấy từ danh sách sản phẩm
  const typeOptions = useMemo(() => {
    const arr = Array.isArray(all) ? all : [];
    const set = new Set();
    arr.forEach((p) => {
      if (p.type) set.add(p.type);
    });
    return Array.from(set);
  }, [all]);

  const items = useMemo(() => {
    let arr = Array.isArray(all) ? [...all] : [];

    if (category) {
      arr = arr.filter(
        (p) =>
          String(p?.category?._id || p?.category || "") === category
      );
    }
    if (q) {
      const kw = q.toLowerCase();
      arr = arr.filter(
        (p) =>
          p?.name?.toLowerCase().includes(kw) ||
          p?.description?.toLowerCase().includes(kw)
      );
    }
    if (type) {
      arr = arr.filter((p) => p?.type === type); // 🆕 lọc theo chủng loại
    }
    if (price) {
      const [min, max] = price.split("-").map(Number);
      arr = arr.filter((p) => {
        const v = p?.minPrice ?? p?.variants?.[0]?.price ?? 0;
        return (isNaN(min) || v >= min) && (isNaN(max) || v <= max);
      });
    }
    const getPrice = (p) => p?.minPrice ?? p?.variants?.[0]?.price ?? 0;
    if (sort === "price_asc") arr.sort((a, b) => getPrice(a) - getPrice(b));
    if (sort === "price_desc") arr.sort((a, b) => getPrice(b) - getPrice(a));
    if (sort === "rating")
      arr.sort((a, b) => (b?.avgRating || 0) - (a?.avgRating || 0));
    return arr;
  }, [all, q, category, price, sort, type]); // 🆕 thêm type vào deps

  const pageSize = 12;
  const page = pageParam;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  const applyToURL = (next = {}) => {
    const qs = new URLSearchParams();
    const merged = {
      q,
      category,
      price,
      sort,
      type, // 🆕
      ...next,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    setParams(qs);
  };

  const resetFilters = () => {
    setQ("");
    setCategory("");
    setPrice("");
    setSort("");
    setType("");
    setParams({});
  };

  return (
    <>
      {/* HERO nhỏ */}
      <section
        className="position-relative"
        style={{
          backgroundImage: "url('/image/ht1.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: 240,
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,.35))",
          }}
        />
        <div className="container position-relative h-100 d-flex align-items-end">
          <div className="pb-3">
            <h1 className="h3 fw-bold text-dark mb-1">Sản phẩm</h1>
            <div className="text-muted">
              Hải sản tươi – khô – đông lạnh từ biển Hải Tiến
            </div>
          </div>
        </div>
      </section>

      {/* FILTER BAR NGANG (sticky) */}
      <div
        className="bg-white border-bottom sticky-top"
        style={{ top: 0, zIndex: 1010 }}
      >
        <div className="container py-2">
          <div className="row g-2 align-items-center">
            {/* tìm kiếm */}
            <div className="col-12 col-md-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  applyToURL({ q });
                }}
                className="d-flex"
              >
                <input
                  className="form-control"
                  placeholder="Tìm tôm, mực, cá…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn btn-primary ms-2">Tìm</button>
              </form>
            </div>

            {/* danh mục */}
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  applyToURL({ category: e.target.value });
                }}
              >
                {categoryOptions.map((op) => (
                  <option key={op.label} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            {/* chủng loại */}
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={type}
                onChange={(e) => {
                  const v = e.target.value;
                  setType(v);
                  applyToURL({ type: v });
                }}
              >
                <option value="">Chủng loại</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* khoảng giá */}
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  applyToURL({ price: e.target.value });
                }}
              >
                <option value="">Khoảng giá</option>
                <option value="0-200000">≤ 200K</option>
                <option value="200000-500000">200K – 500K</option>
                <option value="500000-99999999">≥ 500K</option>
              </select>
            </div>

            {/* sort */}
            <div className="col-12 col-md-2 d-flex align-items-center gap-2 justify-content-md-end">
              <select
                className="form-select"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  applyToURL({ sort: e.target.value });
                }}
              >
                <option value="">Mặc định</option>
                <option value="price_asc">Giá ↑</option>
                <option value="price_desc">Giá ↓</option>
                <option value="rating">Đánh giá</option>
              </select>
            </div>

            <div className="col-12 d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Có <b>{items.length}</b> sản phẩm
              </small>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="container py-3">
        {loading ? (
          <div className="row g-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div className="col-6 col-md-4 col-lg-3" key={i}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center text-muted py-5">
            Không tìm thấy sản phẩm phù hợp.
          </div>
        ) : (
          <>
            <div className="row g-3">
              {pageItems.map((p) => (
                <div key={p._id} className="col-6 col-md-4 col-lg-3">
                  <ProductCard p={p} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <nav>
                  <ul className="pagination">
                    <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                      <button
                        className="page-link"
                        onClick={() =>
                          setParams({
                            ...Object.fromEntries(params),
                            page: String(page - 1),
                          })
                        }
                      >
                        «
                      </button>
                    </li>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <li
                        key={i}
                        className={`page-item ${
                          page === i + 1 ? "active" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            setParams({
                              ...Object.fromEntries(params),
                              page: String(i + 1),
                            })
                          }
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li
                      className={`page-item ${
                        page >= totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setParams({
                            ...Object.fromEntries(params),
                            page: String(page + 1),
                          })
                        }
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
