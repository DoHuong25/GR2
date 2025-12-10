import { useEffect, useState } from "react";
import { http } from "../../services/http";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      const s = await http.get("/admin/statistics");
      setStats(s.data);
      const o = await http.get("/admin/orders?status=all");
      setOrders((o.data || []).slice(0, 6));
    })();
  }, []);

  return (
    <>
      {/* ROW 1: 3 cards thống kê */}
      <div className="row g-3 mb-3">
        <StatCard
          title="Sản phẩm"
          value={stats?.totalProducts || 0}
          subtitle="Tổng số sản phẩm"
          color="#F97316"
        />
        <StatCard
          title="Đơn hàng"
          value={stats?.totalOrders || 0}
          subtitle="Tổng số đơn"
          color="#6366F1"
        />
        <StatCard
          title="Doanh thu"
          value={(stats?.totalRevenue || 0).toLocaleString("vi-VN") + "đ"}
          subtitle="Từ đơn hoàn thành"
          color="#10B981"
        />
      </div>

      {/* ROW 2: Recent orders + (placeholder) chart */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <h5 className="mb-0">Đơn gần đây</h5>
                <small className="text-muted">
                  {orders.length} đơn mới nhất
                </small>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="small text-muted">
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách</th>
                      <th>Ngày</th>
                      <th className="text-end">Tổng</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id}>
                        <td className="fw-semibold small">
                          #{String(o._id).slice(-6)}
                        </td>
                        <td className="small">
                          {o?.shippingAddress?.name || o?.customer?.username}
                        </td>
                        <td className="small text-muted">
                          {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="small text-end">
                          {(o.total || 0).toLocaleString("vi-VN")}đ
                        </td>
                        <td>
                          <span className={"badge rounded-pill " + badgeClass(o.status)}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!orders.length && (
                      <tr>
                        <td colSpan={5} className="text-center small text-muted py-3">
                          Chưa có đơn hàng nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Chart placeholder */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body">
              <h6 className="mb-1">Hoạt động đơn hàng</h6>
              <small className="text-muted">Chart placeholder</small>
              <div
                style={{
                  height: 180,
                  borderRadius: 16,
                  background:
                    "linear-gradient(180deg, rgba(99,102,241,0.18), rgba(129,140,248,0.05))",
                  marginTop: 12,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, subtitle, color }) {
  return (
    <div className="col-md-4">
      <div
        className="card border-0 shadow-sm rounded-4 h-100"
        style={{ padding: 4 }}
      >
        <div className="card-body">
          <div
            className="rounded-3 d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: 40,
              height: 40,
              background: `${color}15`,
              color,
              fontSize: 18,
            }}
          >
            •
          </div>
          <div className="small text-muted mb-1">{title}</div>
          <div className="fs-4 fw-bold mb-1">{value}</div>
          <div className="small text-muted">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function badgeClass(status) {
  switch (status) {
    case "Hoàn thành":
      return "bg-success-subtle text-success";
    case "Đang xử lý":
    case "Đang giao hàng":
      return "bg-primary-subtle text-primary";
    case "Đã hủy":
    case "Hoàn trả":
      return "bg-danger-subtle text-danger";
    default:
      return "bg-secondary-subtle text-secondary";
  }
}
