import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Layers3,
  Loader2,
  MessageCircle,
  PlayCircle,
  Radio,
  RefreshCcw,
  Smartphone,
  Wifi,
} from "lucide-react";

import Snackbar from "../components/ui/Snackbar";
import { api } from "../lib/api";

const FACEBOOK_NO_LIVE_MESSAGE =
  "Không tìm thấy Facebook Live đang phát. Hãy live trên Facebook trước rồi bấm kết nối.";

const TIKTOK_NO_LIVE_MESSAGE =
  "TikTok của bạn hiện chưa live hoặc username chưa đúng nên hệ thống chưa bắt được bình luận.";

function getErrorMessage(error, fallback) {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error?.detail) {
    return error.detail;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}

function normalizeTikTokUsername(value) {
  return String(value || "").replace("@", "").trim();
}

export default function LiveSessionsPage() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [tiktokLoading, setTiktokLoading] = useState(false);

  const [facebookLiveVideoId, setFacebookLiveVideoId] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("vuonlanthanhnha");

  const [historyFilter, setHistoryFilter] = useState("all");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "warning",
    title: "",
  });

  function showSnackbar(message, type = "warning", title = "Thông báo") {
    setSnackbar({
      open: true,
      message,
      type,
      title,
    });
  }

  function closeSnackbar() {
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }));
  }

  useEffect(() => {
    if (!snackbar.open) return undefined;

    const timer = window.setTimeout(() => {
      closeSnackbar();
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [snackbar.open]);

  const filteredSessions = useMemo(() => {
    if (historyFilter === "all") return sessions;

    return sessions.filter((session) => session.platform === historyFilter);
  }, [sessions, historyFilter]);

  const stats = useMemo(() => {
    return {
      total: sessions.length,
      facebook: sessions.filter((item) => item.platform === "facebook").length,
      tiktok: sessions.filter((item) => item.platform === "tiktok").length,
      connected: sessions.filter((item) => item.connection_status === "connected")
        .length,
      error: sessions.filter((item) => item.connection_status === "error").length,
    };
  }, [sessions]);

  async function loadSessions() {
    try {
      setLoading(true);

      const data = await api.getLiveSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      showSnackbar(
        getErrorMessage(error, "Không tải được lịch sử phiên live."),
        "error",
        "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleConnectFacebook() {
    try {
      setFacebookLoading(true);

      const cleanLiveVideoId = facebookLiveVideoId.trim();

      const session = await api.connectFacebookLive({
        title: cleanLiveVideoId
          ? `Facebook Video ${cleanLiveVideoId}`
          : "Facebook Live",
        live_video_id: cleanLiveVideoId || null,
      });

      showSnackbar(
        session?.reused
          ? "Đã mở lại phiên Facebook Live đang hoạt động."
          : "Đã kết nối Facebook Live thành công.",
        "success",
        "Kết nối thành công"
      );

      navigate(`/live/${session.id}`);
    } catch (error) {
      const message = getErrorMessage(error, FACEBOOK_NO_LIVE_MESSAGE);

      showSnackbar(
        message,
        message.toLowerCase().includes("token") ? "error" : "warning",
        message.toLowerCase().includes("token")
          ? "Facebook cần cập nhật token"
          : "Chưa thể kết nối Facebook Live"
      );
    } finally {
      setFacebookLoading(false);
    }
  }

  async function handleConnectTikTok() {
    const cleanUsername = normalizeTikTokUsername(tiktokUsername);

    if (!cleanUsername) {
      showSnackbar(
        "Vui lòng nhập username TikTok trước khi kết nối.",
        "warning",
        "Thiếu username TikTok"
      );
      return;
    }

    try {
      setTiktokLoading(true);

      const session = await api.connectTikTokLive({
        title: `TikTok Live @${cleanUsername}`,
        username: cleanUsername,
      });

      showSnackbar(
        session?.reused
          ? "Đã mở lại phiên TikTok Live đang hoạt động."
          : "Đã kết nối TikTok Live thành công.",
        "success",
        "Kết nối thành công"
      );

      navigate(`/live/${session.id}`);
    } catch (error) {
      showSnackbar(
        getErrorMessage(error, TIKTOK_NO_LIVE_MESSAGE),
        "warning",
        "Chưa thể kết nối TikTok Live"
      );
    } finally {
      setTiktokLoading(false);
    }
  }

  function getStatusLabel(status) {
    if (status === "connected") return "Đã kết nối";
    if (status === "connecting") return "Đang kết nối";
    if (status === "ended") return "Đã kết thúc";
    if (status === "error") return "Có lỗi";
    return "Chưa kết nối";
  }

  function getStatusClass(status) {
    if (status === "connected") return "bg-green-50 text-green-700";
    if (status === "connecting") return "bg-yellow-50 text-yellow-700";
    if (status === "ended") return "bg-slate-100 text-slate-600";
    if (status === "error") return "bg-red-50 text-red-600";
    return "bg-slate-100 text-slate-600";
  }

  function getPlatformLabel(platform) {
    if (platform === "facebook") return "Facebook";
    if (platform === "tiktok") return "TikTok";
    return platform || "Live";
  }

  function getPlatformClass(platform) {
    if (platform === "facebook") return "bg-blue-50 text-blue-700";
    if (platform === "tiktok") return "bg-slate-900 text-white";
    return "bg-slate-100 text-slate-700";
  }

  function getEmptyText() {
    if (historyFilter === "facebook") {
      return "Chưa có lịch sử Facebook Live.";
    }

    if (historyFilter === "tiktok") {
      return "Chưa có lịch sử TikTok Live.";
    }

    return "Chưa có phiên live nào.";
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">
        <section className="rounded-[1.75rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-5 text-white shadow-sm sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-green-50 ring-1 ring-white/20">
            <Radio size={14} />
            Quản lý livestream bán hàng
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">
            Phiên live
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/85 sm:text-base">
            Kết nối Facebook hoặc TikTok Live để lưu comment, xem lại lịch sử và
            tạo đơn hàng từ từng comment.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-xs text-green-50/80">Tổng phiên</p>
              <p className="mt-1 text-2xl font-black">{stats.total}</p>
            </div>

            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-xs text-green-50/80">Facebook</p>
              <p className="mt-1 text-2xl font-black">{stats.facebook}</p>
            </div>

            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-xs text-green-50/80">TikTok</p>
              <p className="mt-1 text-2xl font-black">{stats.tiktok}</p>
            </div>

            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-xs text-green-50/80">Có lỗi</p>
              <p className="mt-1 text-2xl font-black">{stats.error}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-700 p-3 text-white">
                <Layers3 size={22} />
              </div>

              <div>
                <h3 className="text-base font-black text-emerald-950 sm:text-lg">
                  Live tổng hợp hôm nay
                </h3>
                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  Xem chung comment Facebook và TikTok trong cùng một màn hình,
                  phù hợp khi bán đồng thời nhiều nền tảng.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/live-events")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              <Layers3 size={18} />
              Mở live tổng hợp
            </button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <MessageCircle size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950">
                  Kết nối Facebook
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Nhập Facebook Video ID để test video cũ, hoặc để trống nếu Page
                  đang live thật.
                </p>
              </div>
            </div>

            <input
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              value={facebookLiveVideoId}
              onChange={(event) => setFacebookLiveVideoId(event.target.value)}
              placeholder="Ví dụ: 1480242407236292"
            />

            <button
              type="button"
              onClick={handleConnectFacebook}
              disabled={facebookLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {facebookLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Wifi size={18} />
              )}
              {facebookLoading
                ? "Đang kết nối..."
                : facebookLiveVideoId.trim()
                  ? "Kết nối Facebook bằng Video ID"
                  : "Tự tìm Facebook Live đang phát"}
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-900">
                <Smartphone size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950">
                  Kết nối TikTok
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  TikTok cần tài khoản đang LIVE public thật mới bắt được comment.
                </p>
              </div>
            </div>

            <input
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              value={tiktokUsername}
              onChange={(event) => setTiktokUsername(event.target.value)}
              placeholder="Ví dụ: vuonlanthanhnha"
            />

            <button
              type="button"
              onClick={handleConnectTikTok}
              disabled={tiktokLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tiktokLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Smartphone size={18} />
              )}
              {tiktokLoading ? "Đang kết nối..." : "Kết nối TikTok Live"}
            </button>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Lịch sử phiên live
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Chọn Facebook hoặc TikTok để xem riêng từng lịch sử.
              </p>
            </div>

            <button
              type="button"
              onClick={loadSessions}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <RefreshCcw size={14} />
              Tải lại
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setHistoryFilter("all")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                historyFilter === "all"
                  ? "bg-green-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setHistoryFilter("facebook")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                historyFilter === "facebook"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Lịch sử Facebook ({stats.facebook})
            </button>

            <button
              type="button"
              onClick={() => setHistoryFilter("tiktok")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                historyFilter === "tiktok"
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Lịch sử TikTok ({stats.tiktok})
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex min-h-36 items-center justify-center rounded-2xl bg-slate-50">
                <div className="text-center">
                  <Loader2 className="mx-auto animate-spin text-green-700" />
                  <p className="mt-2 text-sm text-slate-500">
                    Đang tải phiên live...
                  </p>
                </div>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                {getEmptyText()}
              </div>
            ) : (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/live/${session.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-green-100 hover:bg-green-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${getPlatformClass(
                          session.platform
                        )}`}
                      >
                        {getPlatformLabel(session.platform)}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${getStatusClass(
                          session.connection_status
                        )}`}
                      >
                        {session.connection_status === "connected" && (
                          <CheckCircle2 size={12} />
                        )}

                        {session.connection_status === "error" && (
                          <AlertCircle size={12} />
                        )}

                        {getStatusLabel(session.connection_status)}
                      </span>

                      {session.duplicate_count > 1 && (
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-700">
                          Gộp {session.duplicate_count} phiên
                        </span>
                      )}
                    </div>

                    <p className="mt-3 break-words text-base font-black text-slate-950">
                      {session.title}
                    </p>

                    <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                      Session ID: {session.id}
                    </p>

                    {session.external_live_id && (
                      <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                        External ID: {session.external_live_id}
                      </p>
                    )}

                    {session.last_error && (
                      <p className="mt-3 break-words rounded-2xl bg-red-50 p-3 text-xs leading-5 text-red-600">
                        {session.last_error}
                      </p>
                    )}
                  </div>

                  <PlayCircle className="shrink-0 text-green-700" size={26} />
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        title={snackbar.title}
        onClose={closeSnackbar}
      />
    </>
  );
}
