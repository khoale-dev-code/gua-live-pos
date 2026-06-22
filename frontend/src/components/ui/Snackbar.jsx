import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const typeMap = {
  success: {
    icon: CheckCircle2,
    box: "border-green-200 bg-green-50 text-green-800",
    title: "Thành công",
  },
  error: {
    icon: AlertCircle,
    box: "border-red-200 bg-red-50 text-red-800",
    title: "Có lỗi xảy ra",
  },
  warning: {
    icon: AlertCircle,
    box: "border-amber-200 bg-amber-50 text-amber-900",
    title: "Thông báo",
  },
  info: {
    icon: Info,
    box: "border-sky-200 bg-sky-50 text-sky-800",
    title: "Thông tin",
  },
};

export default function Snackbar({
  open,
  message,
  type = "warning",
  title,
  onClose,
}) {
  if (!open || !message) return null;

  const config = typeMap[type] || typeMap.warning;
  const Icon = config.icon;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[9999] flex justify-center px-4 sm:justify-end sm:px-6">
      <div
        className={[
          "w-full max-w-md rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur",
          "animate-[fadeInUp_.25s_ease-out]",
          config.box,
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 shrink-0" size={20} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">
              {title || config.title}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Đóng thông báo"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}