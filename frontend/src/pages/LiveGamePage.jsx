import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Gift,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Shuffle,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import { api } from "../lib/api";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function shortText(value, max = 90) {
  const text = String(value || "").trim();

  if (text.length <= max) return text || "—";

  return `${text.slice(0, max)}...`;
}

function Avatar({ src, name }) {
  const initial = String(name || "K").trim().charAt(0).toUpperCase() || "K";
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-sm font-black text-green-700">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || "avatar"}
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-2xl object-cover"
    />
  );
}

function StatCard({ title, value, sub, icon: Icon, tone = "green" }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          {sub && <p className="mt-1 text-xs font-semibold text-slate-500">{sub}</p>}
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function LiveGamePage() {
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedPrizeId, setSelectedPrizeId] = useState("");
  const [customPrizeName, setCustomPrizeName] = useState("");
  const [prizeQuantity, setPrizeQuantity] = useState(1);
  const [excludePreviousWinners, setExcludePreviousWinners] = useState(true);

  const [participants, setParticipants] = useState([]);
  const [draws, setDraws] = useState([]);
  const [winner, setWinner] = useState(null);

  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSession = useMemo(() => {
    return sessions.find((session) => String(session.id) === String(selectedSessionId));
  }, [sessions, selectedSessionId]);

  const availableParticipants = useMemo(() => {
    if (!excludePreviousWinners) return participants;
    return participants.filter((participant) => !participant.is_previous_winner);
  }, [participants, excludePreviousWinners]);

  async function loadBaseData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [sessionData, productData] = await Promise.all([
        api.getLiveGameSessions(),
        api.refreshProducts(),
      ]);

      const safeSessions = Array.isArray(sessionData) ? sessionData : [];
      const safeProducts = Array.isArray(productData) ? productData : [];

      setSessions(safeSessions);
      setProducts(safeProducts.filter((product) => product.is_active !== false));

      if (!selectedSessionId && safeSessions.length > 0) {
        const activeSession =
          safeSessions.find(
            (session) =>
              session.connection_status === "connected" ||
              session.connection_status === "connecting" ||
              session.status === "active"
          ) || safeSessions[0];

        setSelectedSessionId(activeSession.id);
      }
    } catch (error) {
      setErrorMessage(error.message || "Không tải được dữ liệu game live.");
    } finally {
      setLoading(false);
    }
  }

  async function loadGameData(sessionId = selectedSessionId) {
    if (!sessionId) {
      setParticipants([]);
      setDraws([]);
      return;
    }

    try {
      setErrorMessage("");

      const [participantData, drawData] = await Promise.all([
        api.getLiveGameParticipants(sessionId),
        api.getLiveGameDraws(sessionId),
      ]);

      setParticipants(
        Array.isArray(participantData?.participants)
          ? participantData.participants
          : []
      );

      setDraws(Array.isArray(drawData) ? drawData : []);
    } catch (error) {
      setErrorMessage(error.message || "Không tải được danh sách người chơi.");
    }
  }

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;

    setWinner(null);
    loadGameData(selectedSessionId);

    const timer = setInterval(() => {
      if (document.hidden) return;
      loadGameData(selectedSessionId);
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedSessionId]);

  async function drawWinner() {
    if (!selectedSessionId) {
      setErrorMessage("Vui lòng chọn phiên live trước khi bốc thăm.");
      return;
    }

    if (availableParticipants.length === 0) {
      setErrorMessage("Chưa có người chơi hợp lệ để bốc thăm.");
      return;
    }

    try {
      setDrawing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await api.drawLiveGameWinner(selectedSessionId, {
        prize_product_id: selectedPrizeId || null,
        prize_product_name: selectedPrizeId ? null : customPrizeName || "Quà livestream",
        prize_quantity: Number(prizeQuantity || 1),
        exclude_previous_winners: excludePreviousWinners,
      });

      setWinner(result);
      setSuccessMessage(`Đã bốc trúng: ${result.winner_name}`);
      await loadGameData(selectedSessionId);
    } catch (error) {
      setErrorMessage(error.message || "Bốc thăm thất bại.");
    } finally {
      setDrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 text-center shadow-sm">
          <Loader2 className="mx-auto animate-spin text-green-700" size={30} />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Đang tải game livestream...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white ring-1 ring-white/25">
              <Sparkles size={14} />
              Game bốc thăm livestream
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Comment là vào danh sách chơi game
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
              Khách chỉ cần comment trong live là tự được đưa vào danh sách.
              Bạn chọn sản phẩm quà tặng free rồi bấm bốc thăm để tìm người thắng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadGameData(selectedSessionId)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-orange-700 transition hover:bg-orange-50"
          >
            <RefreshCcw size={17} />
            Cập nhật comment
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-green-700">
          <Trophy size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Người chơi"
          value={participants.length}
          sub="Tính từ comment trong live"
          icon={UsersRound}
          tone="green"
        />

        <StatCard
          title="Còn lượt bốc"
          value={availableParticipants.length}
          sub={excludePreviousWinners ? "Đã loại người trúng trước" : "Cho phép trúng lại"}
          icon={Shuffle}
          tone="amber"
        />

        <StatCard
          title="Đã bốc trong phiên này"
          value={draws.length}
          sub="Chỉ tính phiên live đang chọn"
          icon={Trophy}
          tone="purple"
        />

        <StatCard
          title="Phiên đang chọn"
          value={selectedSession?.platform || "—"}
          sub={selectedSession?.title || "Chưa chọn phiên live"}
          icon={MessageCircle}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Cài đặt bốc thăm</h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                Chọn phiên live
              </span>
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Chọn live</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.platform} · {session.title || session.external_live_id || session.id} · {session.participant_count || 0} người chơi · {session.draw_count || 0} lượt bốc
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                Sản phẩm quà tặng free
              </span>
              <select
                value={selectedPrizeId}
                onChange={(event) => setSelectedPrizeId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Quà tự nhập</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.stock !== undefined ? `· tồn ${product.stock}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {!selectedPrizeId && (
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Tên quà tự nhập
                </span>
                <input
                  value={customPrizeName}
                  onChange={(event) => setCustomPrizeName(event.target.value)}
                  placeholder="Ví dụ: 1 chậu lan mini"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                Số lượng quà
              </span>
              <input
                type="number"
                min="1"
                value={prizeQuantity}
                onChange={(event) => setPrizeQuantity(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={excludePreviousWinners}
                onChange={(event) => setExcludePreviousWinners(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300"
              />
              <span className="text-sm font-bold text-slate-700">
                Không cho người đã trúng trước đó trúng lại
              </span>
            </label>

            <button
              type="button"
              onClick={drawWinner}
              disabled={drawing || availableParticipants.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {drawing ? <Loader2 className="animate-spin" size={20} /> : <Shuffle size={20} />}
              Bốc thăm ngay
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Người vừa trúng</h2>

          {winner ? (
            <div className="mt-5 rounded-[2rem] bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center">
              <Trophy className="mx-auto text-orange-500" size={56} />

              <p className="mt-4 text-sm font-black uppercase tracking-wide text-orange-600">
                Chúc mừng
              </p>

              <h3 className="mt-2 text-3xl font-black text-slate-950">
                {winner.winner_name}
              </h3>

              <p className="mt-3 text-base font-bold text-slate-700">
                Lượt #{winner.draw_round} · Trúng: {winner.prize_quantity} × {winner.prize_product_name}
              </p>

              <p className="mt-4 rounded-2xl bg-white/70 p-4 text-sm font-semibold text-slate-500">
                Comment: {shortText(winner.winner_comment, 160)}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-[2rem] bg-slate-50 p-8 text-center">
              <Gift className="mx-auto text-slate-300" size={54} />
              <p className="mt-3 text-sm font-bold text-slate-500">
                Bấm bốc thăm để tìm người thắng game.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            Danh sách người chơi
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Mỗi khách được gom theo ID nền tảng hoặc tên khách/comment.
          </p>

          <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {participants.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                Chưa có comment nào trong live này.
              </p>
            ) : (
              participants.map((participant) => (
                <div
                  key={`${participant.platform}-${participant.participant_key}`}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <Avatar
                    src={participant.customer_avatar}
                    name={participant.display_name}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-black text-slate-950">
                        {participant.display_name}
                      </p>

                      {participant.is_previous_winner && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                          Đã trúng
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {participant.platform} · {participant.comment_count} comment ·{" "}
                      {formatDate(participant.last_commented_at)}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {shortText(participant.latest_message)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Lịch sử trao quà</h2>

          <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {draws.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                Chưa có lượt bốc thăm nào.
              </p>
            ) : (
              draws.map((draw) => (
                <div
                  key={draw.id}
                  className="rounded-2xl border border-amber-100 bg-amber-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={draw.winner_avatar} name={draw.winner_name} />

                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-950">{draw.winner_name}</p>
                      <p className="mt-1 text-sm font-bold text-orange-700">
                        Lượt #{draw.draw_round} · {draw.prize_quantity} × {draw.prize_product_name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {draw.winner_platform} · {formatDate(draw.created_at)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Comment: {shortText(draw.winner_comment)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
