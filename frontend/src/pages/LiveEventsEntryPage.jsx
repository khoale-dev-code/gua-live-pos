import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Loader2, Radio } from "lucide-react";
import { api } from "../lib/api";

export default function LiveEventsEntryPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Đang mở buổi live hôm nay...");

  useEffect(() => {
    async function openTodayLiveEvent() {
      try {
        setMessage("Đang lấy buổi live của ngày hiện tại...");

        const event = await api.getActiveLiveEvent();

        if (!event?.id) {
          throw new Error("Không tạo được buổi live hôm nay.");
        }

        setMessage("Đang gắn Facebook/TikTok đang live hôm nay...");

        try {
          await api.attachActiveSessionsToLiveEvent(event.id);
        } catch {
          // Nếu chưa có session active thì vẫn cho vào màn hình live hôm nay.
        }

        navigate(`/live-events/${event.id}`, { replace: true });
      } catch (error) {
        alert(error.message || "Không mở được buổi live hôm nay.");
      }
    }

    openTodayLiveEvent();
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-[1.75rem] border border-slate-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-50 text-green-700">
          <Radio size={28} />
        </div>

        <h1 className="mt-4 text-xl font-black text-slate-950">
          Live tổng hợp hôm nay
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Mỗi ngày là một buổi live riêng. Facebook và TikTok của hôm nay sẽ được xem chung một màn hình.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <Loader2 className="mx-auto animate-spin text-green-700" />
          <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-black text-green-700">
          <CalendarDays size={14} />
          Chỉ xử lý phiên live ngày hiện tại
        </div>
      </div>
    </div>
  );
}
