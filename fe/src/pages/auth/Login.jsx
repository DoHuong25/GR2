// src/pages/auth/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Auth } from "@/services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const [roleFilter, setRoleFilter] = useState(null); // null = tất cả, "admin" = admin, "customer" = khách
  const nav = useNavigate();

  const onSubmit = async (e) => {
  e.preventDefault();
  setErr("");

  try {
    const data = await Auth.login({ email, password });
    const role = data?.user?.role;

    // Kiểm tra role filter
    // roleFilter: null = tất cả, "admin" = admin/employee, "customer" = customer
    if (roleFilter === "admin" && (role !== "admin" && role !== "employee")) {
      setErr(`❌ Tài khoản này là ${role === 'customer' ? 'Khách hàng' : 'Khác'}. Vui lòng chọn loại tài khoản phù hợp.`);
      return;
    } else if (roleFilter === "customer" && role !== "customer") {
      setErr(`❌ Tài khoản này là ${role === 'admin' ? 'Admin' : role === 'employee' ? 'Nhân viên' : 'Khác'}. Vui lòng chọn loại tài khoản phù hợp.`);
      return;
    }

    // Phát event để Header biết token thay đổi
    window.dispatchEvent(new Event("tokenChanged"));

    if (role === "admin") {
      // Admin → Dashboard thống kê
      nav("/admin", { replace: true });
    } else if (role === "employee") {
      // Nhân viên → trang quản lý đơn hàng
      nav("/admin/orders", { replace: true });
    } else {
      // Khách → về trang chủ
      nav("/", { replace: true });
    }
  } catch (e) {
    setErr(e?.response?.data?.message || "Đăng nhập thất bại.");
  }
};


  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h2 className="text-center mb-4">Đăng nhập</h2>
      <form onSubmit={onSubmit} className="card p-4 shadow-sm rounded-4">
        {/* Toggle role */}
        <div className="mb-3">
          <label className="form-label d-block">Loại tài khoản</label>
          <div className="btn-group w-100" role="group">
            <input 
              type="radio" 
              className="btn-check" 
              name="roleFilter" 
              id="roleAll"
              checked={roleFilter === null}
              onChange={() => setRoleFilter(null)}
            />
            <label className="btn btn-outline-secondary" htmlFor="roleAll">
              Tất cả
            </label>

            <input 
              type="radio" 
              className="btn-check" 
              name="roleFilter" 
              id="roleAdmin"
              checked={roleFilter === "admin"}
              onChange={() => setRoleFilter("admin")}
            />
            <label className="btn btn-outline-danger" htmlFor="roleAdmin">
              Admin/Nhân viên
            </label>

            <input 
              type="radio" 
              className="btn-check" 
              name="roleFilter" 
              id="roleCustomer"
              checked={roleFilter === "customer"}
              onChange={() => setRoleFilter("customer")}
            />
            <label className="btn btn-outline-success" htmlFor="roleCustomer">
              Khách hàng
            </label>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={email}
                 onChange={(e)=>setEmail(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label">Mật khẩu</label>
          <div className="input-group">
            <input
              className="form-control"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={()=>setShowPwd(v=>!v)}
              title={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {err && <div className="alert alert-danger py-2">{err}</div>}
        <button className="btn btn-primary w-100">Đăng nhập</button>

        <div className="text-center mt-3">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </div>
      </form>
    </div>
  );
}
