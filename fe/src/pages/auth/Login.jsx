import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Auth } from "@/services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await Auth.login({ email, password });
      nav("/");
      location.reload();
    } catch (e) {
      setErr(e?.response?.data?.message || "Đăng nhập thất bại.");
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h2 className="text-center mb-4">Đăng nhập</h2>
      <form onSubmit={onSubmit} className="card p-4 shadow-sm rounded-4">
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
