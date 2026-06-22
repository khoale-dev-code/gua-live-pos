import { useEffect, useState } from "react";
import { Eye, EyeOff, Leaf, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import Snackbar from "../components/ui/Snackbar";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    username: "admin",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "error",
    title: "",
  });

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, {
        replace: true,
      });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (!snackbar.open) return undefined;

    const timer = window.setTimeout(() => {
      setSnackbar((prev) => ({
        ...prev,
        open: false,
      }));
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [snackbar.open]);

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.username.trim() || !form.password) {
      setSnackbar({
        open: true,
        type: "warning",
        title: "Thiếu thông tin",
        message: "Vui lòng nhập tài khoản và mật khẩu.",
      });
      return;
    }

    try {
      setSubmitting(true);

      await login(form.username.trim(), form.password);

      navigate(from, {
        replace: true,
      });
    } catch (error) {
      setSnackbar({
        open: true,
        type: "error",
        title: "Đăng nhập thất bại",
        message: error.message || "Tài khoản hoặc mật khẩu không đúng.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white">
        <div className="absolute left-[-10%] top-[-15%] h-72 w-72 rounded-full bg-green-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
            <div className="hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-10 lg:block">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-green-50 ring-1 ring-white/20">
                <Leaf size={15} />
                Orchid Flow POS
              </div>

              <h1 className="mt-10 text-5xl font-black leading-tight tracking-tight">
                Quản lý shop lan, live và đơn hàng trong một màn hình.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-green-50/80">
                Trang quản trị chỉ dành cho chủ shop. Đăng nhập để xem sản phẩm,
                phiên live, comment và đơn hàng.
              </p>

              <div className="mt-10 grid gap-3">
                <div className="rounded-3xl bg-white/15 p-5">
                  <p className="text-sm font-black">Bảo vệ dữ liệu shop</p>
                  <p className="mt-1 text-sm leading-6 text-green-50/75">
                    Người ngoài không thể vào dashboard nếu không có tài khoản.
                  </p>
                </div>

                <div className="rounded-3xl bg-white/15 p-5">
                  <p className="text-sm font-black">Phù hợp bán livestream</p>
                  <p className="mt-1 text-sm leading-6 text-green-50/75">
                    Comment, khách hàng, đơn hàng và tồn kho được giữ riêng tư.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 text-slate-950 sm:p-8 lg:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="rounded-2xl bg-green-700 p-3 text-white">
                    <Leaf size={22} />
                  </div>

                  <div>
                    <p className="text-lg font-black">Orchid Flow POS</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Đăng nhập quản trị shop
                    </p>
                  </div>
                </div>

                <div className="mt-8 lg:mt-0">
                  <div className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                    Khu vực quản trị
                  </div>

                  <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                    Đăng nhập shop
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Nhập tài khoản chủ shop để tiếp tục sử dụng hệ thống.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">
                      Tài khoản
                    </span>

                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-green-600 focus-within:ring-4 focus-within:ring-green-100">
                      <UserRound size={18} className="text-slate-400" />
                      <input
                        value={form.username}
                        onChange={(event) =>
                          updateForm("username", event.target.value)
                        }
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                        placeholder="admin"
                        autoComplete="username"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">
                      Mật khẩu
                    </span>

                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-green-600 focus-within:ring-4 focus-within:ring-green-100">
                      <LockKeyhole size={18} className="text-slate-400" />
                      <input
                        value={form.password}
                        onChange={(event) =>
                          updateForm("password", event.target.value)
                        }
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                        placeholder="Nhập mật khẩu"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-green-900/15 transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <LockKeyhole size={18} />
                    )}
                    {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                  <p className="font-black text-slate-700">Tài khoản mặc định</p>
                  <p className="mt-1">
                    Username: <strong>admin</strong>
                  </p>
                  <p>
                    Password lấy trong file backend <strong>.env</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        title={snackbar.title}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </>
  );
}
