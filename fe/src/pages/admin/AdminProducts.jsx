import { useEffect, useMemo, useState } from "react";
import { http } from "../../services/http";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [types, setTypes] = useState([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // user hiện tại (để biết có phải admin không)
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = currentUser?.role === "admin";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, tRes] = await Promise.all([
        http.get("/shop/categories"),
        http.get("/admin/products", { params: { q } }),
        http.get("/admin/product-types"),
      ]);

      setCats(Array.isArray(cRes.data) ? cRes.data : []);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setTypes(Array.isArray(tRes.data) ? tRes.data : []);
    } catch (err) {
      console.error(err);
      alert("Không tải được dữ liệu sản phẩm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let arr = Array.isArray(products) ? [...products] : [];
    if (catFilter) {
      arr = arr.filter(
        (p) => String(p.category?._id || p.category) === String(catFilter)
      );
    }
    if (typeFilter) {
      arr = arr.filter((p) => p.type === typeFilter);
    }
    return arr;
  }, [products, catFilter, typeFilter]);

  const onSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const onDelete = async (p) => {
    if (!isAdmin) return;
    if (!window.confirm(`Xóa sản phẩm "${p.name}"?`)) return;
    try {
      await http.delete(`/admin/products/${p._id}`);
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Không xóa được sản phẩm.");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setShowForm(true);
  };

  const onSaved = (saved) => {
    setShowForm(false);
    setEditing(null);
    fetchData();
    if (!saved) return;
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x._id === saved._id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  const base =
    (typeof import.meta !== "undefined" && import.meta.env.VITE_API_URL)
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:4000";

  return (
    <div className="container-fluid py-2">
      {/* FILTER BAR */}
      <div className="card border-0 shadow-sm rounded-4 mb-3 p-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <form onSubmit={onSearch}>
              <label className="form-label small text-muted">Tìm sản phẩm</label>
              <div className="input-group">
                <input
                  className="form-control"
                  placeholder="Tên sản phẩm..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  Tìm
                </button>
              </div>
            </form>
          </div>

          <div className="col-md-3">
            <label className="form-label small text-muted">Danh mục</label>
            <select
              className="form-select"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {cats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small text-muted">Chủng loại</label>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <button
              type="button"
              className="btn btn-success mt-3 mt-md-0 w-100"
              onClick={openCreate}
            >
              + Thêm sản phẩm
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-2">
            <h5 className="mb-0">Danh sách sản phẩm</h5>
            <small className="text-muted">{filtered.length} sản phẩm</small>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Không có sản phẩm.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="small text-muted">
                  <tr>
                    <th>Ảnh</th>
                    <th>Tên</th>
                    <th>Danh mục</th>
                    <th>Chủng loại</th>
                    <th>Biến thể</th>
                    <th>Giá thấp nhất</th>
                    <th>Tạo bởi</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const minPrice =
                      p.variants && p.variants.length
                        ? Math.min(...p.variants.map((v) => v.price))
                        : 0;
                    const img = p.image ? `${base}${p.image}` : "/assets/ca-thu-nuong.jpg";

                    return (
                      <tr key={p._id}>
                        <td>
                          <img
                            src={img}
                            alt={p.name}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 12,
                            }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/assets/ca-thu-nuong.jpg";
                            }}
                          />
                        </td>
                        <td className="small">
                          <div className="fw-semibold">{p.name}</div>
                          <div className="text-muted text-truncate" style={{ maxWidth: 260 }}>
                            {p.description}
                          </div>
                        </td>
                        <td className="small">{p.category?.name || "—"}</td>
                        <td className="small">{p.type || "—"}</td>
                        <td className="small">{p.variants?.length || 0} biến thể</td>
                        <td className="small">
                          {minPrice.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="small">{p.createdBy?.username || "—"}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            type="button"
                            onClick={() => openEdit(p)}
                          >
                            Sửa
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              type="button"
                              onClick={() => onDelete(p)}
                            >
                              Xóa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <ProductFormModal
          product={editing}
          categories={cats}
          types={types}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

/* ====== MODAL THÊM/SỬA SẢN PHẨM ====== */

function ProductFormModal({ product, categories, types, onClose, onSaved }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [categoryId, setCategoryId] = useState(
    product?.category?._id || product?.category || ""
  );
  const [type, setType] = useState(product?.type || "");
  const [imageFile, setImageFile] = useState(null);
  const [variants, setVariants] = useState(
    product?.variants?.length
      ? product.variants.map((v) => ({
          name: v.name,
          price: v.price,
          unit: v.unit || "kg",
        }))
      : [{ name: "", price: "", unit: "kg" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: "", price: "", unit: "kg" }]);
  };

  const updateVariant = (idx, field, value) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const removeVariant = (idx) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !description || !categoryId || !type) {
      setError("Vui lòng nhập đầy đủ tên, mô tả, danh mục và chủng loại.");
      return;
    }
    if (!variants.length || variants.some((v) => !v.name || !v.price)) {
      setError("Mỗi biến thể phải có tên và giá.");
      return;
    }
    if (!isEdit && !imageFile) {
      setError("Vui lòng chọn ảnh sản phẩm.");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("categoryId", categoryId);
      fd.append("type", type);
      fd.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            name: v.name,
            price: Number(v.price),
            unit: v.unit || "kg",
          }))
        )
      );
      if (imageFile) {
        fd.append("image", imageFile);
      }

      let res;
      if (isEdit) {
        res = await http.put(`/admin/products/${product._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await http.post("/admin/products", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      onSaved(res.data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Lưu sản phẩm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(15,23,42,.35)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-0">
            <h5 className="modal-title">
              {isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Tên sản phẩm</label>
                  <input
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Danh mục</label>
                  <select
                    className="form-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Chủng loại (Tôm, Cua, Cá...)</label>
                  <input
                    list="product-type-sugg"
                    className="form-control"
                    placeholder="VD: Tôm, Cua, Cá, Mực..."
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  />
                  <datalist id="product-type-sugg">
                    {(types || []).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div className="col-md-6">
                  <label className="form-label small">
                    Ảnh sản phẩm {isEdit && "(để trống nếu giữ nguyên)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={(e) => setImageFile(e.target.files[0])}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small">Mô tả</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Biến thể */}
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label small mb-0">
                    Biến thể (khối lượng / size...)
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={addVariant}
                  >
                    + Thêm biến thể
                  </button>
                </div>

                {variants.map((v, idx) => (
                  <div className="row g-2 align-items-end mb-2" key={idx}>
                    <div className="col-md-5">
                      <input
                        className="form-control"
                        placeholder="Tên biến thể (VD: 0.5kg, 1kg...)"
                        value={v.name}
                        onChange={(e) =>
                          updateVariant(idx, "name", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        placeholder="Giá"
                        value={v.price}
                        onChange={(e) =>
                          updateVariant(idx, "price", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        className="form-control"
                        placeholder="Đơn vị"
                        value={v.unit}
                        onChange={(e) =>
                          updateVariant(idx, "unit", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-2 text-end">
                      {variants.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeVariant(idx)}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer border-0">
              <button
                type="button"
                className="btn btn-light"
                onClick={onClose}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm mới"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
