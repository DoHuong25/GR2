// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import App from "./App";
import Home from "./pages/User/Home.jsx";
import Products from "./pages/User/Products.jsx";
import ProductDetail from "./pages/User/ProductDetail.jsx";
import Cart from "./pages/User/Cart.jsx";
import PaymentConfirm from "./pages/User/PaymentConfirm.jsx";
import Profile from "./pages/User/Profile.jsx";
import Orders from "./pages/User/Orders.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminCustomers from "./pages/admin/AdminCustomers.jsx";
import AdminReviews from "./pages/admin/AdminReviews.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "{}");
  } catch {
    return {};
  }
};

const router = createBrowserRouter([
  // 🧊 Layout KHÁCH (App: Header + Footer)
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "san-pham", element: <Products /> },
      { path: "san-pham/:id", element: <ProductDetail /> },
      { path: "cart", element: <Cart /> },
      { path: "thanh-toan/:orderId", element: <PaymentConfirm /> },
      { path: "profile", element: <Profile /> },
      { path: "orders", element: <Orders /> },

      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      { path: "*", element: <div className="container py-5">404 — Không tìm thấy trang</div> },
    ],
  },

  // 🛠 Layout ADMIN (Admin + Nhân viên)
  {
    path: "/admin",
    element: <AdminLayout currentUser={getCurrentUser()} />,
    children: [
      { index: true, element: <AdminDashboard /> },   // /admin
      { path: "orders", element: <AdminOrders /> },   // /admin/orders
      { path: "orders/:orderId", element: <AdminOrderDetail /> }, // /admin/orders/:orderId
      { path: "products", element: <AdminProducts /> },
      { path: "customers", element: <AdminCustomers /> },
      { path: "reviews", element: <AdminReviews/>},
      { path: "users", element: <AdminUsers /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
