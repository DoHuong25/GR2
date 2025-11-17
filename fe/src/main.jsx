import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import App from "./App";
import Home from "./pages/User/Home.jsx";
import Products from "./pages/User/Products.jsx";
import ProductDetail from "./pages/User/ProductDetail.jsx";

// ✨ Thêm 2 trang mới:
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "san-pham", element: <Products /> },
      { path: "san-pham/:id", element: <ProductDetail /> },

      // ✅ Route đăng nhập / đăng ký
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      { path: "*", element: <div className="container py-5">404 — Không tìm thấy trang</div> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
