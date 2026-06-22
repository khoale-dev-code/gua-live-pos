import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackagePlus,
  Plus,
  Printer,
  Radio,
  RefreshCcw,
  ShoppingCart,
  X,
} from "lucide-react";
import { buildFullAddress, formatCurrency } from "./liveSaleUtils";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100";

const selectClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100 disabled:bg-slate-100 disabled:text-slate-400";

export function LiveSaleHero({ sessionId, comments, onRefresh }) {
  const usedCount = comments.filter(
    (comment) => Boolean(comment.order_id) || comment.status === "used"
  ).length;

  return (
    <section className="rounded-[1.75rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-5 text-white shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Radio size={14} />
            Phiên live đang xem
          </div>

          <h2 className="mt-4 text-2xl font-black sm:text-4xl">
            Comment phiên live
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/85">
            Bấm comment để tạo đơn. Nếu cùng số điện thoại trong cùng phiên live,
            hệ thống sẽ cộng cây vào đơn cũ và chỉ tính phí ship một lần.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-green-800 transition hover:bg-green-50"
        >
          <RefreshCcw size={16} />
          Tải lại comment
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/15 p-4">
          <p className="text-xs text-green-50/80">Session ID</p>
          <p className="mt-1 break-all text-xs font-bold">{sessionId}</p>
        </div>

        <div className="rounded-2xl bg-white/15 p-4">
          <p className="text-xs text-green-50/80">Tổng comment</p>
          <p className="mt-1 text-2xl font-black">{comments.length}</p>
        </div>

        <div className="rounded-2xl bg-white/15 p-4">
          <p className="text-xs text-green-50/80">Đã tạo/cộng đơn</p>
          <p className="mt-1 text-2xl font-black">{usedCount}</p>
        </div>
      </div>
    </section>
  );
}

export function CommentList({
  comments,
  loading,
  errorMessage,
  onSelectComment,
  onRefresh,
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
          <MessageCircle size={20} className="text-green-700" />
          Danh sách comment
        </h3>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
        >
          <RefreshCcw size={14} />
          Tải lại
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex min-h-52 items-center justify-center rounded-2xl bg-slate-50">
            <div className="text-center">
              <Loader2 className="mx-auto animate-spin text-green-700" />
              <p className="mt-2 text-sm text-slate-500">
                Đang tải comment...
              </p>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            Chưa có comment nào trong phiên live này.
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onClick={() => onSelectComment(comment)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CommentCard({ comment, onClick }) {
  const used = Boolean(comment.order_id) || comment.status === "used";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        used
          ? "border-green-100 bg-green-50"
          : "border-slate-100 bg-slate-50 hover:border-green-100 hover:bg-green-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {comment.customer_avatar ? (
          <img
            src={comment.customer_avatar}
            alt={comment.customer_name || "Khách hàng"}
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-black text-white">
            {(comment.customer_name || "K").slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-950">
              {comment.customer_name || "Khách chưa định danh"}
            </p>

            {comment.customer_platform_id && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                Facebook ID: {comment.customer_platform_id}
              </span>
            )}

            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {comment.platform || "facebook"}
            </span>

            {used && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                <CheckCircle2 size={12} />
                Đã thêm vào đơn
              </span>
            )}
          </div>

          <p className="mt-1 break-words text-sm leading-6 text-slate-700">
            {comment.message}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {comment.created_at
              ? new Date(comment.created_at).toLocaleString("vi-VN")
              : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

export function OrderModal(props) {
  const {
    selectedComment,
    products,
    orderForm,
    orderItems,
    orderSubtotal,
    orderTotal,
    orderLoading,
    addressTree,
    addressLoading,
    addressError,
    customerLookupLoading,
    customerLookupMessage,
    selectedProvince,
    availableDistricts,
    selectedDistrict,
    availableWards,
    selectedWard,
    updateOrderForm,
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
    updateOrderItem,
    addOrderItem,
    removeOrderItem,
    closeOrderSheet,
    handleSaveOrder,
  } = props;

  if (!selectedComment) return null;

  const commentAlreadyUsed =
    Boolean(selectedComment.order_id) || selectedComment.status === "used";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-4 shadow-2xl sm:max-w-5xl sm:rounded-[1.75rem] sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-950">
              Tạo đơn từ bình luận
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {selectedComment.customer_name || "Khách livestream"} ·{" "}
              {selectedComment.platform}
            </p>
          </div>

          <button
            type="button"
            onClick={closeOrderSheet}
            className="rounded-full bg-slate-100 p-2 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {commentAlreadyUsed && (
          <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-bold leading-6 text-green-700">
            Comment này đã được thêm vào đơn. Bạn có thể xem lại ở mục Đơn hàng.
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <CustomerSection
              orderForm={orderForm}
              updateOrderForm={updateOrderForm}
              customerLookupLoading={customerLookupLoading}
              customerLookupMessage={customerLookupMessage}
            />

            <AddressSection
              orderForm={orderForm}
              addressTree={addressTree}
              addressLoading={addressLoading}
              addressError={addressError}
              selectedProvince={selectedProvince}
              availableDistricts={availableDistricts}
              selectedDistrict={selectedDistrict}
              availableWards={availableWards}
              selectedWard={selectedWard}
              updateOrderForm={updateOrderForm}
              handleProvinceChange={handleProvinceChange}
              handleDistrictChange={handleDistrictChange}
              handleWardChange={handleWardChange}
            />

            <ProductItemsSection
              products={products}
              orderItems={orderItems}
              updateOrderItem={updateOrderItem}
              addOrderItem={addOrderItem}
              removeOrderItem={removeOrderItem}
            />
          </div>

          <OrderSummary
            selectedComment={selectedComment}
            orderForm={orderForm}
            orderSubtotal={orderSubtotal}
            orderTotal={orderTotal}
            orderLoading={orderLoading}
            commentAlreadyUsed={commentAlreadyUsed}
            updateOrderForm={updateOrderForm}
            handleSaveOrder={handleSaveOrder}
          />
        </div>
      </div>
    </div>
  );
}


function CustomerSection({
  orderForm,
  updateOrderForm,
  customerLookupLoading,
  customerLookupMessage,
}) {
  return (
    <section className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
      <h4 className="text-base font-black text-slate-950">
        Thông tin khách hàng
      </h4>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500">
            Tên khách hàng
          </label>
          <input
            className={inputClass}
            placeholder="Nhập tên khách hàng *"
            value={orderForm.customer_name}
            onChange={(event) =>
              updateOrderForm("customer_name", event.target.value)
            }
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500">
            Tên Facebook
          </label>
          <input
            className={inputClass}
            placeholder="Nhập tên Facebook nếu có"
            value={orderForm.fb_name}
            onChange={(event) => updateOrderForm("fb_name", event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500">
            Số điện thoại
          </label>
          <input
            className={inputClass}
            placeholder="Nhập số điện thoại *"
            value={orderForm.customer_phone}
            onChange={(event) =>
              updateOrderForm("customer_phone", event.target.value)
            }
          />

          {customerLookupLoading && (
            <p className="mt-1.5 text-xs font-bold text-green-700">
              Đang tìm thông tin khách cũ...
            </p>
          )}

          {!customerLookupLoading && customerLookupMessage && (
            <p className="mt-1.5 text-xs font-bold text-slate-500">
              {customerLookupMessage}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500">
            Link Facebook
          </label>
          <input
            className={inputClass}
            placeholder="Dán link Facebook nếu có"
            value={orderForm.fb_link}
            onChange={(event) => updateOrderForm("fb_link", event.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

function AddressSection(props) {
  const {
    orderForm,
    addressTree,
    addressLoading,
    addressError,
    customerLookupLoading,
    customerLookupMessage,
    selectedProvince,
    availableDistricts,
    selectedDistrict,
    availableWards,
    selectedWard,
    updateOrderForm,
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
  } = props;

  return (
    <section className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-black text-slate-950">Địa chỉ giao nhận</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Chọn theo 3 cấp để tiện giao hàng: Tỉnh/Thành phố → Quận/Huyện →
            Phường/Xã.
          </p>
        </div>

        {addressLoading && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            <Loader2 size={13} className="animate-spin" />
            Đang tải địa chỉ
          </span>
        )}
      </div>

      {addressError && (
        <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {addressError}
          <p className="mt-1 text-xs font-medium text-red-600">
            Tạm thời bạn vẫn có thể nhập địa chỉ bằng tay bên dưới.
          </p>
        </div>
      )}

      {addressError ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            className={inputClass}
            placeholder="Tỉnh / Thành phố"
            value={orderForm.province}
            onChange={(event) =>
              updateOrderForm("province", event.target.value)
            }
          />

          <input
            className={inputClass}
            placeholder="Quận / Huyện"
            value={orderForm.district}
            onChange={(event) =>
              updateOrderForm("district", event.target.value)
            }
          />

          <input
            className={inputClass}
            placeholder="Phường / Xã"
            value={orderForm.ward}
            onChange={(event) => updateOrderForm("ward", event.target.value)}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            className={selectClass}
            value={selectedProvince?.code || ""}
            onChange={(event) => handleProvinceChange(event.target.value)}
            disabled={addressLoading}
          >
            <option value="">
              {addressLoading
                ? "Đang tải tỉnh/thành..."
                : "Chọn tỉnh / thành phố *"}
            </option>

            {addressTree.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={selectedDistrict?.code || ""}
            onChange={(event) => handleDistrictChange(event.target.value)}
            disabled={!selectedProvince || addressLoading}
          >
            <option value="">
              {!selectedProvince
                ? "Chọn tỉnh/thành trước"
                : "Chọn quận / huyện *"}
            </option>

            {availableDistricts.map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={selectedWard?.code || ""}
            onChange={(event) => handleWardChange(event.target.value)}
            disabled={!selectedDistrict || addressLoading}
          >
            <option value="">
              {!selectedDistrict
                ? "Chọn quận/huyện trước"
                : "Chọn phường / xã *"}
            </option>

            {availableWards.map((ward) => (
              <option key={ward.code} value={ward.code}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <textarea
        className={`mt-3 min-h-20 w-full ${inputClass}`}
        placeholder="Số nhà, tên đường, ghi chú giao hàng *"
        value={orderForm.address_detail}
        onChange={(event) =>
          updateOrderForm("address_detail", event.target.value)
        }
      />

      <div className="mt-3 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-500">
        <span className="font-bold text-slate-700">Địa chỉ sẽ lưu:</span>{" "}
        {buildFullAddress(orderForm) || "Chưa đủ thông tin địa chỉ"}
      </div>
    </section>
  );
}

function ProductItemsSection({
  products,
  orderItems,
  updateOrderItem,
  addOrderItem,
  removeOrderItem,
}) {
  return (
    <section className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-black text-slate-950">Sản phẩm khách chốt</h4>

        <button
          type="button"
          onClick={addOrderItem}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-green-700 px-3 py-2 text-xs font-black text-white"
        >
          <Plus size={14} />
          Thêm sản phẩm
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {orderItems.map((item, index) => {
          const selectedProduct = products.find(
            (product) => product.id === item.product_id
          );

          return (
            <div
              key={`${item.product_id || "item"}-${index}`}
              className="rounded-2xl bg-white p-3"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_90px_auto]">
                <select
                  className={selectClass}
                  value={item.product_id}
                  onChange={(event) =>
                    updateOrderItem(index, "product_id", event.target.value)
                  }
                >
                  <option value="">Chọn sản phẩm *</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name} -{" "}
                      {formatCurrency(product.price)} - còn {product.stock}
                    </option>
                  ))}
                </select>

                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  placeholder="SL"
                  value={item.quantity}
                  onChange={(event) =>
                    updateOrderItem(index, "quantity", event.target.value)
                  }
                />

                <button
                  type="button"
                  onClick={() => removeOrderItem(index)}
                  className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600"
                >
                  Xóa
                </button>
              </div>

              {selectedProduct && (
                <p className="mt-2 text-xs text-slate-500">
                  Giá: {formatCurrency(selectedProduct.price)} · Tồn kho:{" "}
                  {selectedProduct.stock}
                </p>
              )}

              <input
                className={`mt-3 w-full ${inputClass}`}
                placeholder="Ghi chú cây / size / mã chậu..."
                value={item.item_note}
                onChange={(event) =>
                  updateOrderItem(index, "item_note", event.target.value)
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrderSummary({
  selectedComment,
  orderForm,
  orderSubtotal,
  orderTotal,
  orderLoading,
  commentAlreadyUsed,
  updateOrderForm,
  handleSaveOrder,
}) {
  return (
    <aside className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
      <h4 className="font-black text-slate-950">Tóm tắt đơn</h4>

      <div className="mt-3 rounded-2xl bg-white p-4">
        <div className="flex items-start gap-2">
          <ShoppingCart size={18} className="mt-0.5 text-green-700" />

          <div>
            <p className="font-black text-slate-950">Bình luận gốc</p>
            <p className="mt-1 break-words text-sm leading-6 text-slate-600">
              {selectedComment.message}
            </p>

            {selectedComment.platform === "facebook" && orderForm.fb_link && (
              <a
                href={orderForm.fb_link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600"
              >
                Mở Facebook
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <input
          className={inputClass}
          type="number"
          min="0"
          placeholder="Phí ship"
          value={orderForm.shipping_fee}
          onChange={(event) =>
            updateOrderForm("shipping_fee", event.target.value)
          }
        />

        <input
          className={inputClass}
          type="number"
          min="0"
          placeholder="Giảm giá"
          value={orderForm.discount}
          onChange={(event) => updateOrderForm("discount", event.target.value)}
        />

        <textarea
          className={`min-h-20 w-full ${inputClass}`}
          placeholder="Ghi chú đơn hàng"
          value={orderForm.note}
          onChange={(event) => updateOrderForm("note", event.target.value)}
        />
      </div>

      <div className="mt-3 rounded-2xl bg-green-50 p-4 text-green-900">
        <div className="flex justify-between text-sm">
          <span>Tạm tính cây mới</span>
          <strong>{formatCurrency(orderSubtotal)}</strong>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span>Phí ship đơn</span>
          <strong>{formatCurrency(orderForm.shipping_fee || 0)}</strong>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span>Giảm giá</span>
          <strong>{formatCurrency(orderForm.discount || 0)}</strong>
        </div>

        <div className="mt-3 flex justify-between border-t border-green-200 pt-3 text-base">
          <span className="font-black">Tổng tạm tính</span>
          <strong>{formatCurrency(orderTotal)}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          disabled={orderLoading || commentAlreadyUsed}
          onClick={() => handleSaveOrder({ shouldPrint: false })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {orderLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <PackagePlus size={18} />
          )}

          {commentAlreadyUsed ? "Comment này đã thêm vào đơn" : "Lưu vào đơn"}
        </button>

        <button
          type="button"
          disabled={orderLoading || commentAlreadyUsed}
          onClick={() => handleSaveOrder({ shouldPrint: true })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {orderLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Printer size={18} />
          )}

          Lưu & in bill
        </button>
      </div>
    </aside>
  );
}
