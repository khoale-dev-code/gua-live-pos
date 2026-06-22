import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  Printer,
  PackageCheck,
  RefreshCcw,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { printOrderReceipt } from "../features/live-sale/liveSaleUtils";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

function getStatusLabel(status) {
  if (status === "new") return "Mới";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "printed") return "Đã in phiếu";
  if (status === "shipped") return "Đang giao";
  if (status === "done") return "Hoàn tất";
  if (status === "cancelled") return "Đã hủy";
  return status || "Không rõ";
}

function getStatusClass(status) {
  if (status === "new") return "bg-blue-50 text-blue-700";
  if (status === "confirmed") return "bg-green-50 text-green-700";
  if (status === "printed") return "bg-purple-50 text-purple-700";
  if (status === "shipped") return "bg-yellow-50 text-yellow-700";
  if (status === "done") return "bg-slate-100 text-slate-700";
  if (status === "cancelled") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredOrders = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    if (!search) return orders;

    return orders.filter((order) => {
      return [
        order.order_code,
        order.customer_name,
        order.fb_name,
        order.customer_phone,
        order.customer_address,
        order.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [orders, keyword]);

  const stats = useMemo(() => {
    return orders.reduce(
      (result, order) => {
        result.total += 1;
        result.revenue += Number(order.total || 0);

        if (order.status === "new") result.new += 1;
        if (order.status === "cancelled") result.cancelled += 1;

        return result;
      },
      {
        total: 0,
        new: 0,
        cancelled: 0,
        revenue: 0,
      }
    );
  }, [orders]);

  async function loadOrders({ force = false } = {}) {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = force ? await api.refreshOrders() : await api.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(error.message || "Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function openOrderDetail(orderId) {
    try {
      setDetailLoading(true);
      const detail = await api.getOrderById(orderId, {
        force: true,
      });
      setSelectedOrder(detail);
    } catch (error) {
      alert(error.message || "Không tải được chi tiết đơn hàng.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleChangeStatus(order, status) {
    try {
      await api.updateOrderStatus(order.id, {
        status,
      });

      await loadOrders({ force: true });

      if (selectedOrder?.id === order.id) {
        await openOrderDetail(order.id);
      }
    } catch (error) {
      alert(error.message || "Không cập nhật được trạng thái.");
    }
  }

  async function handleCancelOrder(order) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy đơn ${order.order_code} không? Tồn kho sẽ được hoàn lại.`
    );

    if (!confirmed) return;

    try {
      await api.deleteOrder(order.id);
      await loadOrders({ force: true });

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
    } catch (error) {
      alert(error.message || "Không hủy được đơn hàng.");
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
      <section className="rounded-[1.75rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-5 text-white shadow-sm sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-green-50 ring-1 ring-white/20">
          <ShoppingCart size={14} />
          Quản lý đơn hàng
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">
          Đơn hàng livestream
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/85 sm:text-base">
          Nếu cùng một buổi live khách mua nhiều lần bằng cùng số điện thoại,
          hệ thống sẽ gộp chung vào một đơn và chỉ tính phí ship một lần.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/15 p-4">
            <p className="text-xs text-green-50/80">Tổng đơn</p>
            <p className="mt-1 text-2xl font-black">{stats.total}</p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <p className="text-xs text-green-50/80">Đơn mới</p>
            <p className="mt-1 text-2xl font-black">{stats.new}</p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <p className="text-xs text-green-50/80">Đơn đã hủy</p>
            <p className="mt-1 text-2xl font-black">{stats.cancelled}</p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <p className="text-xs text-green-50/80">Doanh thu tạm tính</p>
            <p className="mt-1 text-2xl font-black">
              {formatCurrency(stats.revenue)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Danh sách đơn hàng
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Bấm “Chi tiết” để xem các lần khách chốt trong cùng một đơn.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Search size={17} className="text-slate-400" />
              <input
                className="w-full min-w-0 bg-transparent text-sm outline-none sm:w-72"
                placeholder="Tìm mã đơn, tên, SĐT, địa chỉ..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={() => loadOrders({ force: true })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <RefreshCcw size={16} />
              Tải lại
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl bg-slate-50">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-green-700" />
                <p className="mt-2 text-sm text-slate-500">
                  Đang tải đơn hàng...
                </p>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center">
              <PackageCheck className="mx-auto text-slate-400" size={36} />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Chưa có đơn hàng phù hợp.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-slate-950">
                          {order.order_code}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                        {Number(order.comment_count || 0) > 1 && (
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">
                            Gộp {order.comment_count} lần chốt
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-bold text-slate-800">
                            Khách:
                          </span>{" "}
                          {order.customer_name || "Chưa có"}
                        </p>

                        <p>
                          <span className="font-bold text-slate-800">
                            SĐT:
                          </span>{" "}
                          {order.customer_phone || "Chưa có"}
                        </p>

                        <p className="md:col-span-2">
                          <span className="font-bold text-slate-800">
                            Địa chỉ:
                          </span>{" "}
                          {order.customer_address || "Chưa có"}
                        </p>

                        <p>
                          <span className="font-bold text-slate-800">
                            Cây:
                          </span>{" "}
                          {order.item_count || 0} dòng sản phẩm
                        </p>

                        <p>
                          <span className="font-bold text-slate-800">
                            Tạo lúc:
                          </span>{" "}
                          {formatDate(order.created_at)}
                        </p>
                      </div>

                      {order.note && (
                        <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-3 text-xs leading-5 text-slate-500">
                          {order.note}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 rounded-2xl bg-white p-4 lg:w-72">
                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex justify-between">
                          <span>Tạm tính</span>
                          <strong>{formatCurrency(order.subtotal)}</strong>
                        </div>

                        <div className="flex justify-between">
                          <span>Phí ship</span>
                          <strong>{formatCurrency(order.shipping_fee)}</strong>
                        </div>

                        <div className="flex justify-between">
                          <span>Giảm giá</span>
                          <strong>{formatCurrency(order.discount)}</strong>
                        </div>

                        <div className="flex justify-between border-t border-slate-100 pt-2 text-base text-slate-950">
                          <span className="font-black">Tổng</span>
                          <strong>{formatCurrency(order.total)}</strong>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openOrderDetail(order.id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-green-700 px-3 py-2 text-sm font-black text-white hover:bg-green-800"
                        >
                          {detailLoading ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Eye size={15} />
                          )}
                          Chi tiết
                        </button>

                        <select
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"
                          value={order.status}
                          onChange={(event) =>
                            handleChangeStatus(order, event.target.value)
                          }
                        >
                          <option value="new">Mới</option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="printed">Đã in phiếu</option>
                          <option value="shipped">Đang giao</option>
                          <option value="done">Hoàn tất</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>

                        {order.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            className="col-span-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-black text-red-600 hover:bg-red-100"
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReload={() => openOrderDetail(selectedOrder.id)}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onReload }) {
  async function handlePrintOrder() {
    try {
      const items = Array.isArray(order.items) ? order.items : [];

      for (const item of items) {
        if (item?.id) {
          await api.markOrderItemPrinted(order.id, item.id);
        }
      }

      printOrderReceipt(order);
      await onReload();
    } catch (error) {
      alert(error.message || "Không in được hóa đơn.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-4 shadow-2xl sm:max-w-5xl sm:rounded-[1.75rem] sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-950">
              Chi tiết đơn {order.order_code}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {order.session_title || "Phiên live"} ·{" "}
              {order.session_platform || "live"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <section className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-black text-slate-950">Thông tin khách</h4>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p>
                  <span className="font-bold text-slate-800">Tên:</span>{" "}
                  {order.customer_name || "Chưa có"}
                </p>

                <p>
                  <span className="font-bold text-slate-800">SĐT:</span>{" "}
                  {order.customer_phone || "Chưa có"}
                </p>

                <p>
                  <span className="font-bold text-slate-800">Facebook:</span>{" "}
                  {order.fb_name || "Chưa có"}
                </p>

                <p>
                  <span className="font-bold text-slate-800">Trạng thái:</span>{" "}
                  {getStatusLabel(order.status)}
                </p>

                <p className="sm:col-span-2">
                  <span className="font-bold text-slate-800">Địa chỉ:</span>{" "}
                  {order.customer_address || "Chưa có"}
                </p>
              </div>
            </section>

            <section className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-black text-slate-950">
                Sản phẩm trong đơn
              </h4>

              <div className="mt-3 space-y-3">
                {(order.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white p-3 ring-1 ring-slate-100"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-slate-950">
                          {item.product_code} - {item.product_name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          SL: {item.quantity} · Đơn giá:{" "}
                          {formatCurrency(item.price)}
                        </p>

                        {item.item_note && (
                          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                            {item.item_note}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-400">
                          In: {item.print_count || 0} lần
                          {item.last_printed_at
                            ? ` · lần cuối ${formatDate(item.last_printed_at)}`
                            : ""}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                        Đã in: {item.print_count || 0} lần
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-black text-slate-950">
                Các comment đã gộp vào đơn
              </h4>

              <div className="mt-3 space-y-3">
                {(order.source_comments || []).length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                    Chưa có comment liên kết.
                  </div>
                ) : (
                  order.source_comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl bg-white p-3 ring-1 ring-slate-100"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-950">
                          {comment.customer_name || "Khách"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                          {comment.platform}
                        </span>

                        <span className="text-xs text-slate-400">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>

                      <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                        {comment.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3">
              <button
                type="button"
                onClick={handlePrintOrder}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                <Printer size={16} />
                In bill hóa đơn
              </button>
            </div>

            <h4 className="font-black text-slate-950">Thanh toán</h4>

            <div className="mt-3 space-y-2 rounded-2xl bg-white p-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Tạm tính sản phẩm</span>
                <strong>{formatCurrency(order.subtotal)}</strong>
              </div>

              <div className="flex justify-between">
                <span>Phí ship</span>
                <strong>{formatCurrency(order.shipping_fee)}</strong>
              </div>

              <div className="flex justify-between">
                <span>Giảm giá</span>
                <strong>{formatCurrency(order.discount)}</strong>
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-3 text-base text-slate-950">
                <span className="font-black">Tổng đơn</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </div>

            {Number(order.comment_count || 0) > 1 && (
              <div className="mt-3 rounded-2xl bg-orange-50 p-4 text-sm font-bold leading-6 text-orange-700">
                Đơn này đã gộp {order.comment_count} lần mua trong cùng buổi
                live bằng cùng số điện thoại. Phí ship chỉ tính một lần.
              </div>
            )}

            {order.note && (
              <div className="mt-3 rounded-2xl bg-white p-4">
                <p className="text-sm font-black text-slate-950">Ghi chú</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {order.note}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
