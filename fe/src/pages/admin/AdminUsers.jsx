// src/pages/admin/AdminUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../services/http";

export default function AdminUsers() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // {id, username, email, phone, address}

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = currentUser?.role === "admin";

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await http.get("/admin/users", {
        params: { role: "employee", q: q || undefined },
      });
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Không tải được danh sách nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const removeEmployee = async (u) => {
    if (!isAdmin) return;
    if (!window.confirm(`Xóa nhân viên "${u.username || u.email}"?`)) {
      return;
    }
    try {
      await http.delete(`/admin/users/${u._id}`);
      setEmployees((prev) => prev.filter((x) => x._id !== u._id));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Không xóa được nhân viên.");
    }
  };

  const onAdded = (emp) => {
    if (!emp) return;
    setEmployees((prev) => [emp, ...prev]);
    setShowForm(false);
  };

  const openEditModal = async (user) => {
    try {
      // Fetch thêm thông tin nhân viên từ backend
      const res = await http.get(`/admin/users/${user._id}`);
      const fullUser = res.data;
      setEditingUser({
        id: fullUser._id,
        username: fullUser.username || "",
        email: fullUser.email || "",
        phone: fullUser.phone || "",
        address: fullUser.address || "",
        password: fullUser.password || ""
      });
    } catch (err) {
      console.error(err);
      alert("Không lấy được thông tin nhân viên.");
    }
  };

  const closeEditModal = () => {
    setEditingUser(null);
  };

  const onUpdated = (updatedUser) => {
    setEmployees((prev) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );
    closeEditModal();
  };

  return (
    <div className="container-fluid py-2">
      {/* FILTER + BUTTON */}
      <div className="card border-0 shadow-sm rounded-4 mb-3 p-3">
        <form onSubmit={onSearch}>
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small text-muted">
                Tìm nhân viên
              </label>
              <input
                className="form-control"
                placeholder="Tên hoặc email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary mt-3 mt-md-0 w-100"
                type="submit"
                disabled={loading}
              >
                Tìm
              </button>
            </div>
            <div className="col-md-3 ms-auto text-end">
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-success mt-3 mt-md-0"
                  onClick={() => setShowForm(true)}
                >
                  + Thêm nhân viên
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-2">
            <h5 className="mb-0">Nhân viên</h5>
            <small className="text-muted">
              {employees.length} nhân viên
            </small>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted">
              Đang tải...
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Chưa có nhân viên.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="small text-muted">
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>SĐT</th>
                    <th>Ngày tạo</th>
                    {isAdmin && <th className="text-end">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((u) => (
                    <tr key={u._id}>
                      <td className="small fw-semibold">
                        {u.username || "—"}
                      </td>
                      <td className="small">{u.email || "—"}</td>
                      <td className="small">{u.phone || "—"}</td>
                      <td className="small text-muted">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(
                              "vi-VN"
                            )
                          : "—"}
                      </td>
                      {isAdmin && (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => openEditModal(u)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeEmployee(u)}
                          >
                            Xóa
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isAdmin && showForm && (
        <AddEmployeeModal
          onClose={() => setShowForm(false)}
          onAdded={onAdded}
        />
      )}

      {isAdmin && editingUser && (
        <EditEmployeeModal
          user={editingUser}
          onClose={closeEditModal}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ onClose, onAdded }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!username || !email || !password) {
      setErr("Vui lòng nhập đầy đủ tên, email, mật khẩu.");
      return;
    }

    try {
      setSaving(true);
      const res = await http.post("/admin/users/add-employee", {
        username,
        email,
        password,
      });
      onAdded(res.data);
    } catch (error) {
      console.error(error);
      setErr(
        error?.response?.data?.message ||
          "Không thêm được nhân viên."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{ background: "rgba(15,23,42,.35)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-0">
            <h5 className="modal-title">Thêm nhân viên</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              {err && <div className="alert alert-danger py-2">{err}</div>}

              <div className="mb-3">
                <label className="form-label small">Tên đăng nhập</label>
                <input
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label small">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label small">Mật khẩu</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
                {saving ? "Đang lưu..." : "Thêm nhân viên"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditEmployeeModal({ user, onClose, onUpdated }) {
  const [tab, setTab] = useState("view"); // "view" hoặc "edit"
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showViewPwd, setShowViewPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!username || !email) {
      setErr("Vui lòng nhập tên đăng nhập và email.");
      return;
    }

    try {
      setSaving(true);
      const updateData = {
        username,
        email,
        phone,
        address,
      };
      if (password) {
        updateData.password = password;
      }
      const res = await http.put(`/admin/users/${user.id}`, updateData);
      onUpdated(res.data);
    } catch (error) {
      console.error(error);
      setErr(
        error?.response?.data?.message ||
          "Không cập nhật được thông tin."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{ background: "rgba(15,23,42,.35)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-0">
            <h5 className="modal-title">Thông tin nhân viên</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          {/* Tabs */}
          <ul className="nav nav-tabs px-3 pt-3 border-0" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === "view" ? "active" : ""}`}
                onClick={() => setTab("view")}
              >
                Xem thông tin
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === "edit" ? "active" : ""}`}
                onClick={() => setTab("edit")}
              >
                Sửa thông tin
              </button>
            </li>
          </ul>

          {/* Tab: View */}
          {tab === "view" && (
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small text-muted">Tên đăng nhập</label>
                    <div className="p-2 bg-light rounded fw-bold">{user.username || "—"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label small text-muted">Role</label>
                    <div className="p-2 bg-light rounded">
                      <span className="badge bg-warning text-dark">
                        {user.role === "admin" ? "Admin" : "Nhân viên"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Email</label>
                <div className="p-2 bg-light rounded">{user.email || "—"}</div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Số điện thoại</label>
                <div className="p-2 bg-light rounded">{user.phone || "—"}</div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Địa chỉ</label>
                <div className="p-2 bg-light rounded">{user.address || "—"}</div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Mật khẩu</label>
                <div className="input-group">
                  <input
                    type={showViewPwd ? "text" : "password"}
                    className="form-control"
                    value={user.password || ""}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowViewPwd(!showViewPwd)}
                    title={showViewPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showViewPwd ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Edit */}
          {tab === "edit" && (
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                {err && <div className="alert alert-danger py-2">{err}</div>}

                <div className="mb-3">
                  <label className="form-label small">Tên đăng nhập</label>
                  <input
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small">Số điện thoại</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123456789"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small">Địa chỉ</label>
                  <input
                    className="form-control"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Địa chỉ"
                  />
                </div>

                <hr />

                <div className="mb-3">
                  <label className="form-label small">Mật khẩu mới (để trống nếu không đổi)</label>
                  <div className="input-group">
                    <input
                      type={showPwd ? "text" : "password"}
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPwd(!showPwd)}
                      title={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPwd ? "Ẩn" : "Hiện"}
                    </button>
                  </div>
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
                  {saving ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
