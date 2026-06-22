import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Loader2,
  Package,
  RefreshCcw,
  ShoppingCart,
  Tags,
  AlertCircle,
} from "lucide-react";

import { api } from "../lib/api";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function MetricCard({ title, value, sub, tone = "slate", icon: Icon = Activity }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs font-semibold text-slate-500">{sub}</p>}
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max, right }) {
  const percent = max > 0 ? Math.min((Number(value || 0) / max) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold text-slate-700">{label}</p>
        <p className="shrink-0 text-xs font-black text-slate-500">{right}</p>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-green-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const summary = analytics?.summary || {};
  const today = analytics?.today || {};
  const month = analytics?.month || {};
  const repeatCustomers = analytics?.repeat_customers || [];
  const topProducts = analytics?.top_products || [];
  const recentDays = analytics?.recent_days || [];

  const maxProductRevenue = useMemo(() => {
    return Math.max(...topProducts.map((item) => Number(item.revenue || 0)), 0);
  }, [topProducts]);

  const maxDayRevenue = useMemo(() => {
    return Math.max(...recentDays.map((item) => Number(item.revenue || 0)), 0);
  }, [recentDays]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await api.getDashboardAnalytics();
      setAnalytics(data);
    } catch (error) {
      setErrorMessage(error.message || "Không tải được dữ liệu dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 text-center shadow-sm">
          <Loader2 className="mx-auto animate-spin text-green-700" size={30} />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Đang tính lợi nhuận và vốn...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-[2rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-green-50 ring-1 ring-white/20">
              <Activity size={14} />
              Dashboard tài chính
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Tổng quan vốn, lời và khách quen
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/85">
              Theo dõi doanh thu, giá vốn, lợi nhuận gộp, vốn nằm trong tồn kho
              và nhóm khách quay lại mua nhiều lần.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-green-800 transition hover:bg-green-50"
          >
            <RefreshCcw size={17} />
            Tải lại
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white/15 p-4">
            <p className="text-xs font-bold text-green-50/75">Doanh thu tháng</p>
            <p className="mt-2 text-2xl font-black">
              {formatCurrency(month.revenue)}
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 p-4">
            <p className="text-xs font-bold text-green-50/75">Lời tháng</p>
            <p className="mt-2 text-2xl font-black">
              {formatCurrency(month.gross_profit)}
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 p-4">
            <p className="text-xs font-bold text-green-50/75">Biên lợi nhuận</p>
            <p className="mt-2 text-2xl font-black">
              {formatPercent(month.profit_margin)}
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 p-4">
            <p className="text-xs font-bold text-green-50/75">Khách quen</p>
            <p className="mt-2 text-2xl font-black">
              {formatNumber(summary.repeat_customer_count)}
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tổng doanh thu"
          value={formatCurrency(summary.revenue)}
          sub={`${formatNumber(summary.order_count)} đơn hợp lệ`}
          icon={ShoppingCart}
          tone="green"
        />

        <MetricCard
          title="Tiền vốn đã bán"
          value={formatCurrency(summary.product_cost)}
          sub={`Nguồn vốn: ${summary.cost_source || "cost_price"}`}
          icon={Tags}
          tone="amber"
        />

        <MetricCard
          title="Tiền lời gộp"
          value={formatCurrency(summary.gross_profit)}
          sub={`Biên lời ${formatPercent(summary.profit_margin)}`}
          icon={Activity}
          tone={Number(summary.gross_profit || 0) >= 0 ? "blue" : "red"}
        />

        <MetricCard
          title="Vốn tồn kho"
          value={formatCurrency(summary.inventory_capital)}
          sub={`${formatNumber(summary.stock_quantity)} sản phẩm/cây còn tồn`}
          icon={Package}
          tone="purple"
        />

        <MetricCard
          title="Tổng vốn đang theo dõi"
          value={formatCurrency(summary.total_capital_tracked)}
          sub="Vốn tồn kho + vốn hàng đã bán"
          icon={Package}
          tone="slate"
        />

        <MetricCard
          title="Khách hàng"
          value={formatNumber(summary.customer_count)}
          sub="Tính theo số điện thoại đã tạo đơn"
          icon={ShoppingCart}
          tone="blue"
        />

        <MetricCard
          title="Khách quen"
          value={formatNumber(summary.repeat_customer_count)}
          sub={`Tỷ lệ quay lại ${formatPercent(summary.repeat_customer_rate)}`}
          icon={Activity}
          tone="green"
        />

        <MetricCard
          title="Cảnh báo tồn kho"
          value={formatNumber(summary.low_stock_count)}
          sub="Sản phẩm/chủng loại chạm ngưỡng tồn"
          icon={AlertCircle}
          tone={summary.low_stock_count > 0 ? "red" : "green"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Hôm nay
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Doanh thu</span>
              <strong>{formatCurrency(today.revenue)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Vốn hàng bán</span>
              <strong>{formatCurrency(today.product_cost)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Lời gộp</span>
              <strong>{formatCurrency(today.gross_profit)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Số đơn</span>
              <strong>{formatNumber(today.order_count)}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Tháng này
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Doanh thu</span>
              <strong>{formatCurrency(month.revenue)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Vốn hàng bán</span>
              <strong>{formatCurrency(month.product_cost)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Lời gộp</span>
              <strong>{formatCurrency(month.gross_profit)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-semibold text-slate-500">Biên lời</span>
              <strong>{formatPercent(month.profit_margin)}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Công thức đang dùng
          </p>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              <strong>Vốn đã bán</strong> = Số lượng bán × Giá vốn.
            </p>
            <p>
              <strong>Lời gộp</strong> = Doanh thu sản phẩm - Vốn đã bán.
            </p>
            <p>
              <strong>Khách quen</strong> = Số điện thoại có từ 2 đơn hợp lệ trở lên.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Top sản phẩm tạo doanh thu
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Dựa trên các đơn chưa huỷ.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {topProducts.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                Chưa có dữ liệu sản phẩm bán ra.
              </p>
            ) : (
              topProducts.map((item) => (
                <ProgressRow
                  key={item.product_name}
                  label={item.product_name}
                  value={item.revenue}
                  max={maxProductRevenue}
                  right={`${formatCurrency(item.revenue)} · lời ${formatCurrency(
                    item.profit
                  )}`}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            Khách hàng quen
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Khách có từ 2 đơn trở lên, tính theo số điện thoại.
          </p>

          <div className="mt-5 space-y-3">
            {repeatCustomers.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                Chưa có khách quay lại mua nhiều lần.
              </p>
            ) : (
              repeatCustomers.map((customer) => (
                <div
                  key={customer.customer_phone}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">
                        {customer.customer_name || "Khách chưa có tên"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {customer.customer_phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-green-700">
                        {formatCurrency(customer.total_spent)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatNumber(customer.order_count)} đơn
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Đơn gần nhất: {formatDate(customer.last_order_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">
          Doanh thu 14 ngày gần đây
        </h2>

        <div className="mt-5 space-y-4">
          {recentDays.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
              Chưa có doanh thu gần đây.
            </p>
          ) : (
            recentDays.map((item) => (
              <ProgressRow
                key={item.day}
                label={formatDate(item.day)}
                value={item.revenue}
                max={maxDayRevenue}
                right={`${formatCurrency(item.revenue)} · ${formatNumber(
                  item.order_count
                )} đơn · lời ${formatCurrency(item.profit)}`}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
