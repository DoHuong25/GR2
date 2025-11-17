import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Auth } from "@/services/auth";

const pwdOk = (s) =>
  typeof s === "string" &&
  s.length >= 6 && s.length <= 64 &&
  /[A-Za-z]/.test(s) && /\d/.test(s);

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!pwdOk(password)) return setErr("Mật khẩu tối thiểu 6 ký tự, gồm ít nhất 1 chữ và 1 số.");
    if (password !== confirm) return setErr("Mật khẩu nhập lại không khớp.");

    try {
      await Auth.register({ email, password });
      nav("/login"); // đăng ký xong sang trang đăng nhập
    } catch (e) {
      setErr(e?.response?.data?.message || "Đăng ký thất bại.");
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h2 className="text-center mb-4">Đăng ký</h2>
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
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>
          <div className="form-text">Tối thiểu 6 ký tự, gồm ít nhất 1 chữ và 1 số.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Nhập lại mật khẩu</label>
          <div className="input-group">
            <input
              className="form-control"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e)=>setConfirm(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={()=>setShowConfirm(v=>!v)}
            >
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {err && <div className="alert alert-danger py-2">{err}</div>}
        <button className="btn btn-success w-100">Đăng ký</button>

        <div className="text-center mt-3">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </form>
    </div>
  );
}
