import { LogOut } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

export default function ShopLogoutButton() {
  const { logout, user } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      className="fixed right-4 top-4 z-[9998] hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-lg backdrop-blur transition hover:bg-red-50 hover:text-red-700 sm:flex"
      title="Đăng xuất"
    >
      <LogOut size={15} />
      <span>{user?.username || "Admin"}</span>
    </button>
  );
}
