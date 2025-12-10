import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../services/http";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

export default function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    address: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchProfile();
  }, [token, navigate]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await http.get("/shop/profile");
      setUser(res.data.user);
      setForm({
        email: res.data.user.email || "",
        phone: res.data.user.phone || "",
        address: res.data.user.address || "",
        bio: res.data.user.bio || "",
      });
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) {
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await http.put("/shop/profile", form);
      setUser(res.data);
      setEditing(false);
      alert("Cập nhật thông tin thành công!");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container py-5 text-muted text-center">Đang tải...</div>;
  }

  if (!user) {
    return (
      <div className="container py-5">
        <div className="text-center text-muted">
          Không tìm thấy thông tin người dùng.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold mb-4">Thông tin cá nhân</h2>

      <div className="row g-4">
        {/* Cột trái: thông tin */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-center mb-3">
                <img
                  src={user.avatar || "/assets/avatar.svg"}
                  alt="Avatar"
                  className="rounded-circle"
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    border: "3px solid #f0f0f0",
                  }}
                />
              </div>

              <div className="mb-3 text-center">
                <h5 className="mb-0">{user.username}</h5>
                <small className="text-muted">{user.role}</small>
              </div>

              <div className="border-top pt-3">
                <div className="mb-3">
                  <label className="text-muted small">Email</label>
                  <div>{user.email}</div>
                </div>

                <div className="mb-3">
                  <label className="text-muted small">Số điện thoại</label>
                  <div>{user.phone || "—"}</div>
                </div>

                <div className="mb-3">
                  <label className="text-muted small">Địa chỉ</label>
                  <div>{user.address || "—"}</div>
                </div>

                <div className="mb-3">
                  <label className="text-muted small">Giới thiệu</label>
                  <div>{user.bio || "—"}</div>
                </div>

                <div className="small text-muted">
                  Tham gia từ:{" "}
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("vi-VN")
                    : "—"}
                </div>
              </div>

              <button
                className="btn btn-primary w-100 mt-3"
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Hủy" : "Chỉnh sửa thông tin"}
              </button>
            </div>
          </div>
        </div>

        {/* Cột phải: form sửa hoặc thống kê */}
        {editing ? (
          <div className="col-lg-7">
            <form onSubmit={onSubmit} className="card border-0 shadow-sm rounded-4">
              <div className="card-body">
                <h6 className="mb-3 fw-bold">Chỉnh sửa thông tin</h6>

                {error && (
                  <div className="alert alert-danger py-2 small mb-3">
                    {error}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small">Số điện thoại</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small">Địa chỉ</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small">Giới thiệu bản thân</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.bio}
                    onChange={(e) =>
                      setForm({ ...form, bio: e.target.value })
                    }
                    placeholder="Chia sẻ về bạn..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body">
                <h6 className="mb-3 fw-bold">Thống kê mua hàng</h6>
                <div className="row g-3">
                  <div className="col-6">
                    <div
                      className="rounded-4 p-3 text-center"
                      style={{ background: "#F0F4FF" }}
                    >
                      <div className="h4 fw-bold text-primary mb-1">
                        {user.orders?.length || 0}
                      </div>
                      <small className="text-muted">Đơn hàng</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div
                      className="rounded-4 p-3 text-center"
                      style={{ background: "#F0F9FF" }}
                    >
                      <div className="h4 fw-bold text-info mb-1">
                        {(user.orders || []).filter(o => o.status === "Hoàn thành").length}
                      </div>
                      <small className="text-muted">Hoàn thành</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body">
                <h6 className="mb-3 fw-bold">Hành động</h6>
                <button
                  className="btn btn-outline-secondary w-100 mb-2"
                  onClick={() =>
                    localStorage.removeItem("token") ||
                    localStorage.removeItem("auth_user") ||
                    navigate("/login")
                  }
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
