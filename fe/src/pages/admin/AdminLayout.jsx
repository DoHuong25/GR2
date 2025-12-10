import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

const menu = [
  { to: "/admin", label: "Dashboard", icon: "🏠" },
  { to: "/admin/orders", label: "Đơn hàng", icon: "📦" },
  { to: "/admin/products", label: "Sản phẩm", icon: "🐟" },
  { to: "/admin/customers", label: "Khách hàng", icon: "👥" },
  { to: "/admin/reviews", label: "Đánh giá", icon: "⭐" },
  { to: "/admin/users", label: "Nhân viên", icon: "👨‍🍳", adminOnly: true },
];

export default function AdminLayout() {
  const nav = useNavigate();

  // Lấy user từ localStorage
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isEmployee = currentUser?.role === "employee";

  // Bảo vệ route admin: chỉ cho admin + employee
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !(isAdmin || isEmployee)) {
      nav("/login", { replace: true });
    }
  }, [isAdmin, isEmployee, nav]);

  const handleCreateOrder = () => {
    nav("/admin/orders");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    nav("/login", { replace: true });
  };

  return (
    <div style={{ background: "#E6F0FF", minHeight: "100vh", padding: "24px" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "32px",
          display: "flex",
          minHeight: "calc(100vh - 48px)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            width: 260,
            borderRight: "1px solid #EEF2FF",
            display: "flex",
            flexDirection: "column",
            padding: "24px 20px",
          }}
        >
          <div className="d-flex align-items-center mb-4">
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Hải Tiến Admin
            </div>
          </div>

          <nav className="flex-grow-1">
            {menu.map((m) => {
              if (m.adminOnly && !isAdmin) return null;
              return (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end={m.to === "/admin"}
                  className={({ isActive }) =>
                    "d-flex align-items-center mb-2 px-3 py-2 rounded-3 text-decoration-none " +
                    (isActive
                      ? "bg-primary text-white"
                      : "text-secondary hover-bg-light")
                  }
                >
                  <span style={{ marginRight: 10 }}>{m.icon}</span>
                  <span style={{ fontSize: 14 }}>{m.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img
                src={currentUser?.avatar || "/assets/avatar.svg"}
                alt=""
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  marginRight: 10,
                  objectFit: "cover",
                }}
              />
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>
                  {currentUser?.username || "Admin"}
                </div>
                <div className="text-muted">{currentUser?.role}</div>
              </div>
            </div>

            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              onClick={handleLogout}
            >
              Thoát
            </button>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="flex-grow-1" style={{ background: "#F8FAFF" }}>
          {/* TOP BAR */}
          <div
            className="d-flex align-items-center justify-content-between"
            style={{ padding: "20px 24px 12px 24px" }}
          >
            <button
              className="btn btn-primary rounded-pill px-4"
              style={{
                background: "linear-gradient(135deg,#6366F1,#4F46E5)",
                border: "none",
              }}
              type="button"
              onClick={handleCreateOrder}
            >
              + Tạo đơn mới
            </button>

            
          </div>

          {/* CONTENT */}
          <div style={{ padding: "0 24px 24px 24px" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
