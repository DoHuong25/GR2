// src/pages/admin/AdminCustomers.jsx
import { useEffect, useState, useMemo } from "react";
import { http } from "../../services/http";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [editing, setEditing] = useState(null); // khách đang sửa (hoặc null)
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    address: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // user hiện tại để biết có phải admin không
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === "admin";

  const fetchCustomers = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await http.get("/admin/customers", {
        params: keyword ? { q: keyword } : {},
      });
      setCustomers(res.data || []);
    } catch (e) {
      console.error(e);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // mở popup sửa
  const startEdit = (c) => {
    setEditing(c);
    setForm({
      username: c.username || "",
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      note: c.note || "",
    });
    setError("");
  };

  const closeModal = () => {
    setEditing(null);
    setError("");
  };

  const onChangeField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!editing?._id) return;
    setSaving(true);
    setError("");

    try {
      const payload = {
        username: form.username,
        email: form.email,
        phone: form.phone,
        address: form.address,
        note: form.note,
      };

      const res = await http.put(`/admin/customers/${editing._id}`, payload);
      const updated = res.data;

      setCustomers((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
      closeModal();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  // XÓA KHÁCH (chỉ Admin)
  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Bạn chắc chắn muốn xóa khách hàng này?")) return;

    try {
      await http.delete(`/admin/users/${id}`);
      setCustomers((prev) => prev.filter((c) => c._id !== id));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Xóa khách hàng thất bại.");
    }
  };

  return (
    <>
      {/* CARD chính: chỉ còn bảng, tràn rộng khung */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          {/* header + tìm kiếm */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Khách hàng</h5>
              <small className="text-muted">
                Tổng: {customers.length} khách
              </small>
            </div>

            <form
              className="d-flex"
              onSubmit={(e) => {
                e.preventDefault();
                fetchCustomers(q);
              }}
            >
              <input
                className="form-control form-control-sm"
                style={{ width: 260 }}
                placeholder="Tìm tên, email, sđt..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn btn-sm btn-outline-primary ms-2">
                Tìm
              </button>
            </form>
          </div>

          {/* bảng khách hàng – tràn hết card */}
          <div className="table-responsive" style={{ maxHeight: 480 }}>
            <table className="table table-sm align-middle mb-0">
              <thead className="table-light small text-muted">
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Địa chỉ</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Đang tải...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Chưa có khách hàng nào.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c._id}>
                      <td className="small fw-semibold">{c.username}</td>
                      <td className="small">{c.email}</td>
                      <td className="small">{c.phone}</td>
                      <td
                        className="small text-truncate"
                        style={{ maxWidth: 260 }}
                      >
                        {c.address}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEdit(c)}
                          >
                            Sửa
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(c._id)}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL SỬA – hiện giống form thêm, nổi trên màn hình */}
      {editing && (
        <>
          {/* backdrop mờ */}
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ background: "rgba(15,23,42,.35)", zIndex: 1040 }}
            onClick={closeModal}
          />
          {/* hộp modal */}
          <div
            className="position-fixed top-50 start-50 translate-middle"
            style={{ zIndex: 1050, minWidth: "540px", maxWidth: "90vw" }}
          >
            <div className="card shadow-lg rounded-4 border-0">
              <div className="card-header border-0 d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  Sửa khách hàng:{" "}
                  <span className="text-primary">{editing.username}</span>
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                ></button>
              </div>
              <form onSubmit={onSubmit}>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small mb-1">Tên khách</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.username}
                        onChange={(e) =>
                          onChangeField("username", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small mb-1">Email</label>
                      <input
                        className="form-control form-control-sm"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          onChangeField("email", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small mb-1">
                        Điện thoại
                      </label>
                      <input
                        className="form-control form-control-sm"
                        value={form.phone}
                        onChange={(e) =>
                          onChangeField("phone", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small mb-1">Địa chỉ</label>
                      <input
                        className="form-control form-control-sm"
                        value={form.address}
                        onChange={(e) =>
                          onChangeField("address", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small mb-1">
                        Ghi chú nội bộ
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={form.note}
                        onChange={(e) =>
                          onChangeField("note", e.target.value)
                        }
                        placeholder="VD: khách hay đặt cuối tuần, ưu tiên ship chiều…"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-1 small mt-2 mb-0">
                      {error}
                    </div>
                  )}
                </div>
                <div className="card-footer d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeModal}
                  >
                    Hủy
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
