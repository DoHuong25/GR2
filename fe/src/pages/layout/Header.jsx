import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { http } from "../../services/http";

// Icons SVG gọn nhẹ
const SearchIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const CartIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.6a2 2 0 0 0 2-1.6L23 6H6"></path>
  </svg>
);
const UserIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const BellIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

export default function Header() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const isHome     = location.pathname === "/";

  const [openMenu, setOpenMenu]   = useState(false);
  const [openUser, setOpenUser]   = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [q, setQ] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    http.get("/shop/cart")
      .then(res => {
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setCartCount(items.reduce((s, it) => s + (it.quantity || 0), 0));
      })
      .catch(() => setCartCount(0));
  }, []);

  // Lắng nghe khi giỏ hàng thay đổi
  useEffect(() => {
    const handleCartUpdated = async () => {
      console.log("🛒 cartUpdated event triggered");
      try {
        const res = await http.get("/shop/cart");
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const count = items.reduce((s, it) => s + (it.quantity || 0), 0);
        console.log("📊 New cart count:", count);
        setCartCount(count);
      } catch (err) {
        console.error("❌ Lỗi lấy giỏ hàng:", err);
      }
    };
    window.addEventListener("cartUpdated", handleCartUpdated);
    return () => window.removeEventListener("cartUpdated", handleCartUpdated);
  }, []);

  // Lắng nghe thay đổi token (khi đăng nhập/đăng xuất)
  useEffect(() => {
    const handleTokenChanged = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener("tokenChanged", handleTokenChanged);
    return () => window.removeEventListener("tokenChanged", handleTokenChanged);
  }, []);

  // Lấy thông báo khi user đăng nhập
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    const fetchNotifications = async () => {
      try {
        const res = await http.get("/notification");
        const notifs = Array.isArray(res.data) ? res.data : [];
        setNotifications(notifs);
        const unread = notifs.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("❌ Lỗi lấy thông báo:", err);
      }
    };

    fetchNotifications();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Lắng nghe khi có thông báo mới từ socket hoặc event
  useEffect(() => {
    const handleNotificationUpdated = async () => {
      console.log("📬 notificationUpdated event triggered");
      try {
        const res = await http.get("/notification");
        const notifs = Array.isArray(res.data) ? res.data : [];
        setNotifications(notifs);
        const unread = notifs.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("❌ Lỗi lấy thông báo:", err);
      }
    };
    window.addEventListener("notificationUpdated", handleNotificationUpdated);
    return () => window.removeEventListener("notificationUpdated", handleNotificationUpdated);
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    const kw = q.trim();
    navigate(kw ? `/san-pham?q=${encodeURIComponent(kw)}` : "/san-pham");
    setShowSearch(false);
    setOpenMenu(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    window.dispatchEvent(new Event("tokenChanged"));
    navigate("/");
  };

  // 🌊 Màu nền “xanh nhẹ nhàng” trên Home để hoà vào banner
  const homeBg = "linear-gradient(180deg, rgba(224, 242, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)"; 
// xanh trời nhạt pha mây trắng

  const commonStyle = {
       background: homeBg,                    // ✅ luôn dùng gradient như Home
       borderBottom: "none",
       boxShadow: "none",
       backdropFilter: "saturate(130%) blur(3px)",
       zIndex: 1020
  };


  return (
    <header className="sticky-top" style={commonStyle}>
      <div className="container d-flex align-items-center justify-content-between py-2">

        {/* Logo / Tên cửa hàng */}
        <Link to="/" className="text-decoration-none d-flex align-items-center">
          <span className="fw-bold" style={{ color: "#1a7f81" }}>Hải Sản Hải Tiến</span>
        </Link>

        {/* Menu desktop */}
        <nav className="d-none d-md-flex align-items-center gap-3">
          <NavLink end to="/" className="nav-link px-2"
                   style={({isActive})=>({ backgroundColor: isActive ? "rgba(26,127,129,0.12)" : "transparent", borderRadius: 8 })}>
            Trang chủ
          </NavLink>
          <NavLink to="/san-pham" className="nav-link px-2"
                   style={({isActive})=>({ backgroundColor: isActive ? "rgba(26,127,129,0.12)" : "transparent", borderRadius: 8 })}>
            Sản phẩm
          </NavLink>
          <NavLink to="/lien-he" className="nav-link px-2"
                   style={({isActive})=>({ backgroundColor: isActive ? "rgba(26,127,129,0.12)" : "transparent", borderRadius: 8 })}>
            Liên hệ
          </NavLink>
        </nav>

        {/* Nhóm icon phải (desktop) */}
        <div className="d-none d-md-flex align-items-center gap-2">
          {/* Search */}
          <button className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowSearch(v => !v)} aria-label="Tìm kiếm">
            <SearchIcon />
          </button>
          {showSearch && (
            <form className="d-flex" onSubmit={onSearch}>
              <input
                className="form-control form-control-sm"
                placeholder="Tìm tôm, mực, cá…"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ width: 220 }}
              />
            </form>
          )}

          {/* Cart */}
          <Link to="/cart" className="btn btn-sm btn-outline-primary position-relative">
            <CartIcon />
            {cartCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Notification */}
          {token && (
            <div className="position-relative">
              <button className="btn btn-sm btn-outline-secondary position-relative"
                      onClick={() => setOpenNotif(v => !v)}
                      title="Thông báo">
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {openNotif && (
                <div className="position-absolute end-0 mt-2 bg-white shadow rounded-3 border"
                     style={{ minWidth: 350, maxHeight: 400, overflowY: 'auto', zIndex: 1000 }}>
                  <div className="px-3 py-2 border-bottom bg-light d-flex justify-content-between align-items-center">
                    <strong className="small">Thông báo ({notifications.length})</strong>
                    {unreadCount > 0 && (
                      <button className="btn btn-sm btn-link text-decoration-none small"
                              onClick={async () => {
                                try {
                                  await http.post('/notification/mark-all-read');
                                  setNotifications(prev => prev.map(n => ({...n, isRead: true})));
                                  setUnreadCount(0);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="text-center py-3 text-muted small">
                      Không có thông báo
                    </div>
                  ) : (
                    <div>
                      {notifications.map((notif, idx) => (
                        <div key={idx} 
                             className={`px-3 py-2 border-bottom small cursor-pointer ${!notif.isRead ? 'bg-light' : ''}`}
                             onClick={async () => {
                               if (!notif.isRead) {
                                 try {
                                   await http.post(`/notification/${notif._id}/read`);
                                   setNotifications(prev => 
                                     prev.map(n => n._id === notif._id ? {...n, isRead: true} : n)
                                   );
                                   setUnreadCount(prev => Math.max(0, prev - 1));
                                 } catch (err) {
                                   console.error(err);
                                 }
                               }
                             }}
                             style={{ cursor: 'pointer' }}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className={`${!notif.isRead ? 'fw-bold' : ''}`}>
                                {notif.message}
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString('vi-VN') : ''}
                              </div>
                            </div>
                            {!notif.isRead && (
                              <span className="badge bg-primary ms-2" style={{ minWidth: '6px', minHeight: '6px', padding: '3px' }}></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User */}
          {!token ? (
            <>
              <Link to="/login" className="btn btn-link btn-sm text-decoration-none">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
            </>
          ) : (
            <div className="position-relative">
              <button className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                      onClick={() => setOpenUser(v => !v)}>
                <UserIcon />
              </button>
              {openUser && (
                <div className="position-absolute end-0 mt-2 bg-white shadow rounded-3 border"
                     style={{ minWidth: 220, zIndex: 1000 }}>
                  <Link to="/profile" className="dropdown-item py-2 px-3 d-block text-decoration-none text-dark">Thông tin cá nhân</Link>
                  <Link to="/orders" className="dropdown-item py-2 px-3 d-block text-decoration-none text-dark">Lịch sử đơn hàng</Link>
                  <button className="dropdown-item py-2 px-3 w-100 text-start" onClick={logout}>Đăng xuất</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút mở mobile menu */}
        <button className="btn btn-outline-secondary d-md-none"
                onClick={() => setOpenMenu(v => !v)} aria-label="Menu">
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {openMenu && (
        <div className="border-top d-md-none" style={{ backgroundColor: isHome ? homeBg : "#fff" }}>
          <div className="container py-2">
            <form className="d-flex mb-2" onSubmit={onSearch}>
              <input className="form-control" placeholder="Tìm tôm, mực, cá…"
                     value={q} onChange={(e)=>setQ(e.target.value)} />
              <button className="btn btn-primary ms-2">Tìm</button>
            </form>

            <div className="d-flex flex-column">
              <NavLink onClick={()=>setOpenMenu(false)} end to="/" className="nav-link py-2">Trang chủ</NavLink>
              <NavLink onClick={()=>setOpenMenu(false)} to="/san-pham" className="nav-link py-2">Sản phẩm</NavLink>
              <NavLink onClick={()=>setOpenMenu(false)} to="/lien-he" className="nav-link py-2">Liên hệ</NavLink>

              <div className="d-flex align-items-center mt-2">
                <CartIcon /><Link to="/cart" className="ms-2 text-decoration-none">Giỏ hàng ({cartCount})</Link>
              </div>

              {!token ? (
                <div className="d-flex gap-2 mt-2">
                  <Link to="/login" className="btn btn-outline-secondary w-50" onClick={()=>setOpenMenu(false)}>Đăng nhập</Link>
                  <Link to="/register" className="btn btn-primary w-50" onClick={()=>setOpenMenu(false)}>Đăng ký</Link>
                </div>
              ) : (
                <div className="d-flex flex-column mt-2">
                  <Link to="/profile" className="nav-link py-1" onClick={()=>setOpenMenu(false)}>Thông tin cá nhân</Link>
                  <Link to="/orders" className="nav-link py-1" onClick={()=>setOpenMenu(false)}>Lịch sử đơn hàng</Link>
                  <button className="btn btn-link text-danger text-start px-0 py-1" onClick={logout}>Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
