import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { http } from "../../services/http"
/* icon giỏ hàng nhỏ */
const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

export default function Home() {
  const [cats, setCats] = useState([]);
  const [best, setBest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          http.get("/shop/categories"),
          http.get("/shop/products"), 
        ]);

        const wanted = ["Hải sản Tươi", "Hải sản Khô", "Hải sản Đông lạnh"];
        const norm = (s) => s?.normalize("NFC")?.toLowerCase();
        const fromApi = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.categories || []);
        const picked = wanted.map(n => fromApi.find(c => norm(c?.name) === norm(n))).filter(Boolean);
        setCats(picked.length ? picked : wanted.map((n, i) => ({ _id: `dummy-${i}`, name: n })));

        // best: chỉ lấy 8 sản phẩm đầu
        const rawBest = Array.isArray(pRes.data) ? pRes.data
          : (pRes.data?.products || pRes.data?.items || pRes.data?.data || pRes.data?.docs || []);
        console.log("[HOME] products raw =", pRes.data);
        console.log("[HOME] best arr     =", rawBest, "isArray?", Array.isArray(rawBest), "len:", rawBest?.length);

        setBest(rawBest.slice(0, 8));

      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-light min-vh-100">
      <section
        className="position-relative text-dark"
        style={{
          backgroundImage: "url('/image/ht.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "420px"
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{ background: "rgba(255,255,255,.35)" }}
        />
        <div className="container position-relative py-5 text-center d-flex flex-column justify-content-center h-100">
          <motion.h1
            className="display-5 fw-bold mb-3"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Hải Sản Hải Tiến
          </motion.h1>
          <p className="lead text-muted">Hải sản tươi từ vùng biển xứ Thanh</p>
          <Link to="/san-pham" className="btn btn-primary px-4 mt-3 mx-auto">
            Khám phá ngay
          </Link>
        </div>
      </section>

      {/*  DANH MỤC  */}
      <CategoryGrid categories={cats} />

      {/* SẢN PHẨM NỔI BẬT */}
      <section className="container py-5">
        <h2 className="h4 fw-bold mb-4 text-center">Sản phẩm nổi bật</h2>
        {loading ? (
          <div className="text-center text-muted py-5">Đang tải...</div>
        ) : (
          <div className="row g-3">
            {(Array.isArray(best) ? best : []).map((p) => (
              <div key={p._id} className="col-6 col-md-3">
                <ProductCard product={p} />
              </div>
            ))}
            {!best?.length && (
              <div className="text-center text-muted">Chưa có sản phẩm để hiển thị.</div>
            )}
          </div>
        )}
      </section>

      {/* GIỚI THIỆU */}
      <section className="py-5" style={{ background: "#FFF9EE" }}>
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-md-6">
              <img
                src="/image/ht3.jpg" 
                className="img-fluid rounded-4 shadow-sm"
                alt="Làng chài Hải Tiến"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/ht2.png"; }}
              />
            </div>
            <div className="col-md-6">
              <h3 className="fw-bold mb-3">Về cửa hàng</h3>
              <p>
                Cửa hàng Hải Tiến được sinh ra từ tình yêu biển và nghề chài truyền thống.
                Chúng tôi mang hương vị biển quê Thanh Hóa đến mọi căn bếp Việt.
              </p>
              <ul className="mb-0">
                <li>Chọn nguyên liệu tại bờ – chuẩn tươi.</li>
                <li>Đóng gói mộc mạc, an toàn, sạch.</li>
                <li>Giao nhanh toàn quốc.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      
    </div>
  );
}

/*Components */
function CategoryGrid({ categories }) {
  const names = ["Hải sản Tươi", "Hải sản Khô", "Hải sản Đông lạnh"];
  const norm = (s) => s?.normalize("NFC").toLowerCase();
  const raw = Array.isArray(categories) ? categories : [];
  const three = names
    .map(n => raw.find(c => norm(c?.name) === norm(n)) || { name: n })
    .slice(0, 3);

  return (
    <section className="py-4 bg-white border-bottom">
      <div className="container">
        <div className="row g-3">
          
          <div className="col-12 col-md-3">
            <div className="h-100 d-flex align-items-center justify-content-center rounded-4 border bg-light">
              <h3 className="h5 m-0 fw-bold text-uppercase">Danh mục</h3>
            </div>
          </div>

          
          {three.map((c, i) => (
            <div className="col-12 col-md-3" key={c._id || i}>
              <Link
                to={c._id ? `/san-pham?category=${c._id}` : "/san-pham"}
                className="text-decoration-none"
              >
                <div
                  className="rounded-4 p-4 border h-100 text-center fw-bold text-dark"
                  style={{
                    background: i === 0 ? "#EAF5F3" : i === 1 ? "#F5E5C0" : "#E0EAF5",
                  }}
                >
                  {c.name}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CARD SẢN PHẨM 
function ProductCard({ product }) {
  const navigate = useNavigate();

  const base =
    (typeof import.meta !== "undefined" && import.meta.env.VITE_API_URL)
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:4000";

  const img = product?.image ? `${base}${product.image}` : "/assets/ca-thu-nuong.jpg";
  const price = product?.minPrice || product?.variants?.[0]?.price || 0;

  const addToCart = async (goCart = false) => {
    try {
      await http.post("/shop/cart", {
        productId: product._id,
        quantity: 1,
        variant: product?.variants?.[0]?.name || "",
      });
      if (goCart) navigate("/cart");
    } catch (e) {
      alert("Không thêm được giỏ hàng. Vui lòng thử lại.");
    }
  };

  const buyNow = () => addToCart(true);

  return (
    <div className="card border-0 shadow-sm h-100 rounded-4">
      {/* Ảnh: click để xem chi tiết */}
      <Link to={`/san-pham/${product._id}`} className="text-decoration-none">
        <div className="ratio ratio-4x3">
          <img
            src={img}
            alt={product?.name}
            className="object-fit-cover rounded-top-4"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/assets/ca-thu-nuong.jpg";
            }}
          />
        </div>
      </Link>

      <div className="card-body text-center">
        {/* Tên: click để xem chi tiết */}
        <Link
          to={`/san-pham/${product._id}`}
          className="text-decoration-none text-dark"
        >
          <h6 className="card-title mb-1 text-truncate" title={product?.name}>
            {product?.name}
          </h6>
        </Link>

        <div className="small text-muted mb-3">{price.toLocaleString()}đ</div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary btn-sm w-50" onClick={buyNow}>
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

