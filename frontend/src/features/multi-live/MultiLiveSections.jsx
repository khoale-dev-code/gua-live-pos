import {
  BadgeCheck,
  Filter,
  Loader2,
  MessageCircle,
  PackagePlus,
  Plus,
  RefreshCcw,
  Send,
  ShoppingBag,
  Smartphone,
  X,
} from "lucide-react";
import { CommentAvatar } from "../live-sale/CommentAvatar";
import {
  formatDateLabel,
  formatTime,
  formatVnd,
  getPlatformClass,
  getPlatformLabel,
  isSameVietnamDate,
  parseMoney,
} from "./multiLiveUtils";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100";

export function MultiLiveHeader({ event, counts, onRefresh }) {
  const dateValue = event?.event_date || event?.started_at;
  const dateLabel = formatDateLabel(dateValue);
  const isToday = isSameVietnamDate(dateValue);

  return (
    <div className="sticky top-0 z-30 -mx-3 bg-slate-50/95 px-3 pb-3 pt-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">
      <section className="rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-green-900 to-emerald-700 p-4 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Smartphone size={14} />
                Live tổng hợp theo ngày
              </div>

              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${
                  isToday
                    ? "bg-emerald-300 text-emerald-950"
                    : "bg-amber-200 text-amber-950"
                }`}
              >
                {isToday ? "Hôm nay" : "Lịch sử"}
              </div>
            </div>

            <h2 className="mt-3 text-xl font-black sm:text-3xl">
              {event?.title || "Buổi live tổng hợp"}
            </h2>

            <p className="mt-1 text-xs text-white/80">
              {dateLabel}
            </p>

            <p className="mt-1 text-xs text-white/70">
              Chỉ xem Facebook + TikTok thuộc cùng ngày live này, không gộp phiên của ngày trước.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="rounded-2xl bg-white/15 p-3 text-white hover:bg-white/25"
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <HeaderStat label="Tất cả" value={counts.total} />
          <HeaderStat label="Facebook" value={counts.facebook} />
          <HeaderStat label="TikTok" value={counts.tiktok} />
          <HeaderStat label="Chưa xử lý" value={counts.new} />
        </div>
      </section>
    </div>
  );
}

function HeaderStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 p-2">
      <p className="text-lg font-black">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/75">{label}</p>
    </div>
  );
}

export function MultiLiveFilters({
  platformFilter,
  statusFilter,
  counts,
  onPlatformChange,
  onStatusChange,
}) {
  return (
    <section className="rounded-[1.25rem] border border-slate-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
        <Filter size={16} className="text-green-700" />
        Bộ lọc comment
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterPill
          active={platformFilter === "all"}
          onClick={() => onPlatformChange("all")}
        >
          Tất cả {counts.total}
        </FilterPill>

        <FilterPill
          active={platformFilter === "facebook"}
          onClick={() => onPlatformChange("facebook")}
        >
          Facebook {counts.facebook}
        </FilterPill>

        <FilterPill
          active={platformFilter === "tiktok"}
          onClick={() => onPlatformChange("tiktok")}
        >
          TikTok {counts.tiktok}
        </FilterPill>

        <FilterPill
          active={statusFilter === "new"}
          onClick={() => onStatusChange(statusFilter === "new" ? "all" : "new")}
        >
          Chưa xử lý {counts.new}
        </FilterPill>

        <FilterPill
          active={statusFilter === "ordered"}
          onClick={() =>
            onStatusChange(statusFilter === "ordered" ? "all" : "ordered")
          }
        >
          Đã lên đơn {counts.ordered}
        </FilterPill>
      </div>
    </section>
  );
}

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-2 text-xs font-black transition ${
        active
          ? "bg-green-700 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function MultiCommentFeed({ comments, loading, onSelectComment }) {
  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-[1.5rem] bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-green-700" />
          <p className="mt-2 text-sm text-slate-500">
            Đang tải comment tổng hợp...
          </p>
        </div>
      </div>
    );
  }

  if (!comments.length) {
    return (
      <div className="rounded-[1.5rem] bg-white p-8 text-center text-sm font-semibold text-slate-500">
        Chưa có comment phù hợp bộ lọc.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          onSelect={() => onSelectComment(comment)}
        />
      ))}
    </section>
  );
}


function isFallbackFacebookName(comment) {
  const platform = String(comment?.platform || "").toLowerCase();
  const name = String(comment?.customer_name || "");

  return platform === "facebook" && name.startsWith("Khách Facebook #");
}

function CommentCard({ comment, onSelect }) {
  const platformLabel = comment.platform_label || getPlatformLabel(comment.platform);
  const ordered = Boolean(comment.order_id);

  return (
    <article className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <CommentAvatar comment={comment} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-950">
              {comment.customer_name || "Khách live"}
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${getPlatformClass(
                comment.platform
              )}`}
            >
              {platformLabel}
            </span>

            {ordered && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700">
                <BadgeCheck size={13} />
                Đã lên đơn
              </span>
            )}
          </div>

          {isFallbackFacebookName(comment) ? (
            <p className="mt-0.5 text-xs font-bold text-amber-600">
              Facebook chưa cấp tên · Nhập tên khách khi tạo đơn
            </p>
          ) : comment.customer_platform_id ? (
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              ID: {comment.customer_platform_id}
            </p>
          ) : null}

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {comment.message || "(Không có nội dung)"}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-400">
              {formatTime(comment.created_at)}
            </p>

            <button
              type="button"
              onClick={onSelect}
              disabled={ordered}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
            >
              <ShoppingBag size={15} />
              {ordered ? "Đã tạo" : "Tạo đơn"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function OrderBottomSheet({
  comment,
  products,
  form,
  items,
  subtotal,
  total,
  loading,
  customerLookupLoading,
  customerLookupMessage,
  onChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  onClose,
}) {
  if (!comment) return null;

  const platformLabel = comment.platform_label || getPlatformLabel(comment.platform);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-4 shadow-2xl sm:mx-auto sm:max-w-3xl sm:rounded-[1.75rem] sm:mb-6">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-slate-100 bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-green-700">
                Tạo đơn từ {platformLabel}
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                {comment.customer_name || "Khách live"}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">
            Comment gốc · {platformLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {comment.message}
          </p>
        </div>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên khách hàng *">
              <input
                className={inputClass}
                value={form.customer_name}
                onChange={(event) => onChange("customer_name", event.target.value)}
              />
            </Field>

            <Field label="Số điện thoại *">
              <input
                className={inputClass}
                inputMode="tel"
                placeholder="VD: 038..."
                value={form.customer_phone}
                onChange={(event) => onChange("customer_phone", event.target.value)}
              />

              {customerLookupLoading && (
                <p className="mt-1.5 text-xs font-bold text-green-700">
                  Đang tìm khách cũ...
                </p>
              )}

              {!customerLookupLoading && customerLookupMessage && (
                <p className="mt-1.5 text-xs font-bold text-slate-500">
                  {customerLookupMessage}
                </p>
              )}
            </Field>
          </div>

          <Field label="Địa chỉ giao hàng *">
            <textarea
              className={`${inputClass} min-h-24`}
              placeholder="Nhập địa chỉ giao hàng"
              value={form.customer_address}
              onChange={(event) => onChange("customer_address", event.target.value)}
            />
          </Field>

          <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-black text-slate-950">Sản phẩm khách chốt</h4>

              <button
                type="button"
                onClick={onAddItem}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"
              >
                <Plus size={14} />
                Thêm
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 bg-white p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_90px_130px_auto]">
                    <Field label="Sản phẩm">
                      <select
                        className={inputClass}
                        value={item.product_id}
                        onChange={(event) =>
                          onItemChange(index, "product_id", event.target.value)
                        }
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.code} - {product.name} ·{" "}
                            {formatVnd(product.price)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="SL">
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(event) =>
                          onItemChange(index, "quantity", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Giá">
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        value={item.price}
                        onChange={(event) =>
                          onItemChange(index, "price", event.target.value)
                        }
                      />
                    </Field>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="self-end rounded-2xl bg-red-50 px-3 py-3 text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <Field label="Ghi chú sản phẩm">
                    <input
                      className={inputClass}
                      placeholder="VD: chọn cây đẹp, hoa trắng..."
                      value={item.item_note}
                      onChange={(event) =>
                        onItemChange(index, "item_note", event.target.value)
                      }
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phí ship">
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.shipping_fee}
                onChange={(event) => onChange("shipping_fee", event.target.value)}
              />
            </Field>

            <Field label="Giảm giá">
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.discount}
                onChange={(event) => onChange("discount", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Ghi chú đơn">
            <textarea
              className={`${inputClass} min-h-20`}
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
            />
          </Field>

          <div className="rounded-[1.25rem] bg-slate-950 p-4 text-white">
            <div className="flex items-center justify-between text-sm">
              <span>Tạm tính</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <span>Tổng đơn</span>
              <strong className="text-lg">{formatVnd(total)}</strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            Tạo đơn & gộp theo khách
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
