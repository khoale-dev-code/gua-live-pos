import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 text-center shadow-sm">
          <Loader2 className="mx-auto animate-spin text-green-700" size={28} />
          <p className="mt-3 text-sm font-bold text-slate-600">
            Đang kiểm tra đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
