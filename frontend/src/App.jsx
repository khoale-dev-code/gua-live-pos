import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Leaf,
  Menu,
  Radio,
  ShoppingCart,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import logoUrl from "./assets/logo.png";

import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import LiveSessionsPage from "./pages/LiveSessionsPage";
import LiveGamePage from "./pages/LiveGamePage";
import LiveSalePage from "./pages/LiveSalePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ShopLogoutButton from "./components/auth/ShopLogoutButton";
import OrdersPage from "./pages/OrdersPage";
import CustomersPage from "./pages/CustomersPage";
import LiveEventsEntryPage from "./pages/LiveEventsEntryPage";
import MultiLiveSalePage from "./pages/MultiLiveSalePage";

const BRAND_NAME = "Vườn Lan Thanh Nhã";
const BRAND_SUBTITLE = "POS bán live hoa lan";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    to: "/products",
    label: "Sản phẩm",
    shortLabel: "SP",
    icon: Leaf,
  },
  {
    to: "/live",
    label: "Phiên live",
    shortLabel: "Live",
    icon: Radio,
  },
  {
    to: "/live-game",
    label: "Game Live",
    shortLabel: "Game",
    icon: Sparkles,
  },
  {
    to: "/customers",
    label: "Khách hàng",
    shortLabel: "Khách",
    icon: UsersRound,
  },
  {
    to: "/orders",
    label: "Đơn hàng",
    shortLabel: "Đơn",
    icon: ShoppingCart,
  },
];

const bottomNavItems = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
  navItems[5],
];

function BrandLogo({ collapsed = false, light = false }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <div
        className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl shadow-sm ring-1 ${
          light
            ? "bg-white ring-slate-200"
            : "bg-white/95 ring-white/20"
        }`}
      >
        <img
          src={logoUrl}
          alt={BRAND_NAME}
          className="h-full w-full object-contain p-1"
        />
      </div>

      {!collapsed && (
        <div className="min-w-0">
          <h1
            className={`truncate text-lg font-black tracking-tight ${
              light ? "text-green-900" : "text-white"
            }`}
          >
            {BRAND_NAME}
          </h1>
          <p
            className={`mt-0.5 truncate text-xs font-semibold ${
              light ? "text-slate-500" : "text-green-50/70"
            }`}
          >
            {BRAND_SUBTITLE}
          </p>
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed = false, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
          isActive
            ? "bg-white text-green-800 shadow-sm"
            : "text-green-50/85 hover:bg-white/10 hover:text-white"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function MobileDrawerItem({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
          isActive
            ? "bg-green-700 text-white shadow-sm"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`
      }
    >
      <Icon size={19} />
      <span>{item.label}</span>
    </NavLink>
  );
}

function BottomNavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-black transition ${
          isActive
            ? "bg-green-700 text-white shadow-sm"
            : "text-slate-500 hover:bg-green-50 hover:text-green-700"
        }`
      }
    >
      <Icon size={19} className="shrink-0" />
      <span className="max-w-full truncate">{item.shortLabel}</span>
    </NavLink>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const currentPage = useMemo(() => {
    const current =
      navItems
        .filter((item) => item.to !== "/")
        .find((item) => location.pathname.startsWith(item.to)) ||
      navItems.find((item) => item.to === "/");

    return current || navItems[0];
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_34%),linear-gradient(to_bottom,#f8fafc,#eef2f7)]">
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-white/10 bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 text-white shadow-xl transition-all duration-300 lg:block ${
          desktopCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex items-center border-b border-white/10 p-4 ${
              desktopCollapsed ? "justify-center" : "justify-between gap-3"
            }`}
          >
            <BrandLogo collapsed={desktopCollapsed} />

            {!desktopCollapsed && (
              <button
                type="button"
                onClick={() => setDesktopCollapsed((prev) => !prev)}
                className="rounded-2xl bg-white/10 p-2 text-green-50 transition hover:bg-white/20"
                title="Thu gọn menu"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {desktopCollapsed && (
              <button
                type="button"
                onClick={() => setDesktopCollapsed((prev) => !prev)}
                className="absolute right-3 top-20 rounded-2xl bg-white/10 p-2 text-green-50 transition hover:bg-white/20"
                title="Mở rộng menu"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-2 p-3">
            {navItems.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                collapsed={desktopCollapsed}
              />
            ))}
          </nav>

          <div className="space-y-3 p-3">
            {!desktopCollapsed && (
              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-sm font-bold">Quản lý bán live hoa lan</p>
                <p className="mt-1 text-xs leading-5 text-green-50/70">
                  Theo dõi sản phẩm, comment, khách hàng, đơn hàng và game live
                  trong một hệ thống.
                </p>
              </div>
            )}

            {!desktopCollapsed && <ShopLogoutButton />}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-green-700 text-white shadow-sm active:scale-95"
            aria-label="Mở menu"
          >
            <Menu size={21} />
          </button>

          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <img
              src={logoUrl}
              alt={BRAND_NAME}
              className="h-full w-full object-contain p-1"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-green-700">
              {BRAND_NAME}
            </p>
            <h1 className="truncate text-lg font-black leading-tight text-slate-950">
              {currentPage?.label || "Dashboard"}
            </h1>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          />

          <aside className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <BrandLogo light />

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => (
                <MobileDrawerItem
                  key={item.to}
                  item={item}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>

            <div className="mt-6 rounded-[1.5rem] bg-green-50 p-4 text-green-900">
              <p className="text-sm font-black">Vườn Lan Thanh Nhã</p>
              <p className="mt-1 text-xs leading-5 text-green-800/80">
                Công cụ quản lý bán live giúp chốt đơn nhanh, lưu khách hàng và
                theo dõi sản phẩm hoa lan dễ dàng hơn.
              </p>
            </div>

            <div className="mt-4">
              <ShopLogoutButton />
            </div>
          </aside>
        </div>
      )}

      <main
        className={`min-h-screen px-3 pb-28 pt-4 transition-all duration-300 sm:px-5 sm:pb-8 sm:pt-6 ${
          desktopCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md gap-1 rounded-3xl bg-white">
          {bottomNavItems.map((item) => (
            <BottomNavItem key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/live" element={<LiveSessionsPage />} />
                <Route path="/live-events" element={<LiveEventsEntryPage />} />
                <Route
                  path="/live-events/:eventId"
                  element={<MultiLiveSalePage />}
                />
                <Route path="/live-game" element={<LiveGamePage />} />
                <Route path="/live/:sessionId" element={<LiveSalePage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/orders" element={<OrdersPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
