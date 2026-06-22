  import {
  useEffect, useMemo, useState } from "react";
  import { NavLink, Route, Routes, useLocation } from "react-router-dom";
  import {
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Leaf,
    Menu,
    Radio,
    ShoppingCart,
    UsersRound,
    X,
  Sparkles,
} from "lucide-react";

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

  function MobileNavItem({ item, onClick }) {
    const Icon = item.icon;

    return (
      <NavLink
        to={item.to}
        end={item.to === "/"}
        onClick={onClick}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
            isActive
              ? "bg-green-700 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`
        }
      >
        <Icon size={19} />
        {item.label}
      </NavLink>
    );
  }

  function AppLayout({ children }) {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);

    const navItems = useMemo(
      () => [
        {
          to: "/",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          to: "/products",
          label: "Sản phẩm",
          icon: Leaf,
        },
        {
      to: "/live-game",
      label: "Game Live",
      icon: Sparkles,
    },
    {
          to: "/live",
          label: "Phiên live",
          icon: Radio,
        },
        {
      to: "/customers",
      label: "Khách hàng",
      icon: UsersRound,
    },
    {
          to: "/orders",
          label: "Đơn hàng",
          icon: ShoppingCart,
    UsersRound,
        },
      ],
      []
    );

    useEffect(() => {
      setMobileOpen(false);
    }, [location.pathname]);

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_32%),linear-gradient(to_bottom,#f8fafc,#eef2f7)]">
        <aside
          className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-white/10 bg-green-900 text-white shadow-xl transition-all duration-300 lg:block ${
            desktopCollapsed ? "w-20" : "w-72"
          }`}
        >
          <div className="flex h-full flex-col">
            <div
              className={`flex items-center border-b border-white/10 p-4 ${
                desktopCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              {!desktopCollapsed && (
                <div>
                  <h1 className="text-xl font-black tracking-tight">
                    GUA Live POS
                  </h1>
                  <p className="mt-1 text-xs text-green-50/70">
                    Orchid & Garden Sale
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setDesktopCollapsed((prev) => !prev)}
                className="rounded-2xl bg-white/10 p-2 text-green-50 transition hover:bg-white/20"
                title={desktopCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
              >
                {desktopCollapsed ? (
                  <ChevronRight size={20} />
                ) : (
                  <ChevronLeft size={20} />
                )}
              </button>
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

            <div className="p-3">
              {!desktopCollapsed && (
                <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-sm font-bold">Bán live nhanh hơn</p>
                  <p className="mt-1 text-xs leading-5 text-green-50/70">
                    Quản lý sản phẩm, comment, đơn hàng và in đơn trong một hệ
                    thống.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-2xl bg-green-700 p-2.5 text-white shadow-sm"
              aria-label="Mở menu"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black text-green-800">
                GUA Live POS
              </h1>
              <p className="truncate text-xs text-slate-500">
                Quản lý bán live cây cảnh / hoa lan
              </p>
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
            />

            <aside className="absolute left-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-green-800">
                    GUA Live POS
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Orchid & Garden Sale
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl bg-slate-100 p-2 text-slate-700"
                  aria-label="Đóng menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-6 space-y-2">
                {navItems.map((item) => (
                  <MobileNavItem
                    key={item.to}
                    item={item}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </nav>

              <div className="mt-6 rounded-[1.5rem] bg-green-50 p-4 text-green-900">
                <p className="text-sm font-black">Mẹo sử dụng</p>
                <p className="mt-1 text-xs leading-5 text-green-800/80">
                  Trên điện thoại, dùng menu này để chuyển nhanh giữa sản phẩm,
                  phiên live và đơn hàng.
                </p>
              </div>
            </aside>
          </div>
        )}

        <main
          className={`min-h-screen p-4 transition-all duration-300 sm:p-6 ${
            desktopCollapsed ? "lg:ml-20" : "lg:ml-72"
          }`}
        >
          {children}
        </main>
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
              <ShopLogoutButton />
              <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/live" element={<LiveSessionsPage />} />

            <Route path="/live-events" element={<LiveEventsEntryPage />} />
            <Route path="/live-events/:eventId" element={<MultiLiveSalePage />} />
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