import Header from "./pages/layout/Header";
import { Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 9999 }}
      />
      <Header />
      <main className={isHome ? "" : "my-4"}>
        <Outlet />
      </main>
      <footer className="bg-light text-center py-3 border-top">
        <small> Làng chài Hoằng Thanh, KDL Biển Hải Tiến, Thanh Hóa – Hotline: 0934434357</small>
      </footer>
    </>
  );
}
