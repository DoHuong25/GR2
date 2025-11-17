import Header from "./pages/layout/Header";
import { Outlet, useLocation } from "react-router-dom";
export default function App() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  return (
    <>
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
