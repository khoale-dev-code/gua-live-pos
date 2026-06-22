import {
  AlertTriangle,
  Archive,
  Edit3,
  History,
  ImagePlus,
  Layers,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCcw,
  Search,
  Save,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { inputClass, smallInputClass } from "./productConstants";
import { BarcodeSvg } from "./barcodeUtils.jsx";
import {
  formatDate,
  formatVnd,
  getProductImage,
  moneyValue,
  parseVnd,
} from "./productUtils";
import {
  FLOWER_COLOR_SUGGESTIONS,
  PLANT_HEIGHT_SUGGESTIONS,
  POT_COLOR_SUGGESTIONS,
  POT_SIZE_SUGGESTIONS,
  SIZE_SUGGESTIONS,
  VARIANT_GROUPS,
  buildVariantDisplayName,
} from "./variantUtils";

export function ProductsHero({ stats, onRefresh }) {
  return (
    <section className="rounded-[1.75rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-5 text-white shadow-sm sm:p-7">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
        <Archive size={14} />
        Quản lý sản phẩm & tồn kho
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight sm:text-4xl">
            Kho sản phẩm
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/85">
            Quản lý giá bán, giá vốn, đơn vị tính, biến thể, nhập hàng, lịch sử tồn kho và barcode.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-green-800 hover:bg-green-50"
        >
          <RefreshCcw size={16} />
          Tải lại
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Sản phẩm" value={stats.totalProducts} />
        <StatCard label="Tổng tồn" value={stats.totalStock} />
        <StatCard label="Sắp hết hàng" value={stats.lowStock} />
        <StatCard label="Có biến thể" value={stats.hasVariants} />
        <StatCard label="Giá trị vốn" value={formatVnd(stats.inventoryValue)} />
      </div>
    </section>
  );
}

export function ProductCreateSection(props) {
  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <PackagePlus size={20} className="text-green-700" />
        <h3 className="text-lg font-black text-slate-950">Thêm sản phẩm</h3>
      </div>

      <ProductForm {...props} mode="create" submitText="Thêm sản phẩm" />
    </section>
  );
}

export function ProductListSection({
  products,
  categories,
  searchText,
  selectedCategoryFilter,
  pageLoading,
  deleteLoadingId,
  onSearchChange,
  onCategoryFilterChange,
  onEdit,
  onDelete,
  onStockIn,
  onVariants,
  onHistory,
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Danh sách sản phẩm
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Hiển thị {products.length} sản phẩm phù hợp.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              className="w-full min-w-0 bg-transparent text-sm outline-none sm:w-72"
              placeholder="Tìm mã, tên, nhà cung cấp..."
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <SlidersHorizontal size={17} className="text-slate-400" />
            <select
              className="w-full bg-transparent text-sm outline-none sm:w-52"
              value={selectedCategoryFilter}
              onChange={(event) => onCategoryFilterChange(event.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4">
        {pageLoading ? (
          <LoadingBox text="Đang tải sản phẩm..." />
        ) : products.length === 0 ? (
          <EmptyBox text="Chưa có sản phẩm phù hợp." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                deleteLoading={deleteLoadingId === product.id}
                onEdit={() => onEdit(product)}
                onDelete={() => onDelete(product)}
                onStockIn={() => onStockIn(product)}
                onVariants={() => onVariants(product)}
                onHistory={() => onHistory(product)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductEditModal({
  product,
  form,
  categories,
  loading,
  imageState,
  existingImages,
  onChange,
  onSubmit,
  onFilesChange,
  onRemoveNewImage,
  onRemoveExistingImage,
  onGenerateBarcode,
  onClose,
}) {
  if (!product) return null;

  return (
    <Modal title={`Sửa sản phẩm ${product.code}`} onClose={onClose}>
      <ProductForm
        mode="edit"
        form={form}
        categories={categories}
        loading={loading}
        submitText="Lưu thay đổi"
        imageState={imageState}
        existingImages={existingImages}
        onSubmit={onSubmit}
        onChange={onChange}
        onFilesChange={onFilesChange}
        onRemoveNewImage={onRemoveNewImage}
        onRemoveExistingImage={onRemoveExistingImage}
        onGenerateBarcode={onGenerateBarcode}
      />
    </Modal>
  );
}

export function StockInModal({
  product,
  variants,
  form,
  loading,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!product) return null;

  return (
    <Modal title={`Nhập hàng - ${product.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-900">
          <p>
            <strong>Tồn hiện tại:</strong> {product.stock} {product.unit || "sp"}
          </p>
          <p>
            <strong>Giá vốn hiện tại:</strong> {formatVnd(product.cost_price)}
          </p>
        </div>

        {variants.length > 0 && (
          <Field label="Nhập cho biến thể">
            <select
              className={inputClass}
              value={form.variant_id}
              onChange={(event) => onChange("variant_id", event.target.value)}
            >
              <option value="">Nhập vào tồn chính của sản phẩm</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.sku ? `${variant.sku} - ` : ""}
                  {variant.name} · tồn {variant.stock}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Số lượng nhập *">
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="VD: 10"
              value={form.quantity}
              onChange={(event) => onChange("quantity", event.target.value)}
            />
          </Field>

          <Field label="Giá vốn nhập">
            <MoneyInput
              value={form.unit_cost}
              onChange={(value) => onChange("unit_cost", value)}
              placeholder="VD: 120000"
            />
          </Field>
        </div>

        <Field label="Nhà cung cấp">
          <input
            className={inputClass}
            placeholder="VD: Vườn lan A"
            value={form.supplier_name}
            onChange={(event) => onChange("supplier_name", event.target.value)}
          />
        </Field>

        <Field label="Ghi chú nhập hàng">
          <textarea
            className={`${inputClass} min-h-24`}
            placeholder="VD: Nhập đợt livestream cuối tuần"
            value={form.note}
            onChange={(event) => onChange("note", event.target.value)}
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <PackagePlus size={18} />
          )}
          Xác nhận nhập hàng
        </button>
      </form>
    </Modal>
  );
}

export function VariantsModal({
  product,
  variants,
  form,
  loading,
  onChange,
  onSubmit,
  onDelete,
  onClose,
}) {
  if (!product) return null;

  return (
    <Modal title={`Biến thể - ${product.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="rounded-[1.25rem] bg-slate-50 p-4">
        <h4 className="font-black text-slate-950">Thêm biến thể</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Nhập theo thuộc tính thực tế của cây/chậu. Nếu không nhập tên thủ công,
          hệ thống sẽ tự ghép tên từ size, chậu, chiều cao và màu.
        </p>

        <div className="mt-3 rounded-2xl bg-white p-3 text-xs font-bold text-green-700">
          Tên sẽ lưu: {buildVariantDisplayName(form) || "Chưa đủ thông tin"}
        </div>

        <VariantAttributeFields form={form} onChange={onChange} />

        <button
          type="submit"
          disabled={loading}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white hover:bg-green-800 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          Thêm biến thể
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {loading && variants.length === 0 ? (
          <LoadingBox text="Đang tải biến thể..." />
        ) : variants.length === 0 ? (
          <EmptyBox text="Sản phẩm này chưa có biến thể." />
        ) : (
          variants.map((variant) => (
            <div
              key={variant.id}
              className="rounded-2xl border border-slate-100 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-slate-950">
                    {variant.sku ? `${variant.sku} - ` : ""}
                    {variant.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Giá bán: {formatVnd(variant.price)} · Giá vốn:{" "}
                    {formatVnd(variant.cost_price)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tồn: {variant.stock} {variant.unit || product.unit} · Tối thiểu:{" "}
                    {variant.min_stock}
                  </p>

                  {variant.low_stock && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                      <AlertTriangle size={13} />
                      Sắp hết hàng
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDelete(variant)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={15} />
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export function HistoryModal({ product, history, loading, onClose }) {
  if (!product) return null;

  return (
    <Modal title={`Lịch sử tồn kho - ${product.name}`} onClose={onClose}>
      {loading ? (
        <LoadingBox text="Đang tải lịch sử tồn kho..." />
      ) : history.length === 0 ? (
        <EmptyBox text="Chưa có lịch sử tồn kho." />
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black uppercase text-slate-600">
                      {item.type}
                    </span>

                    {item.variant_name && (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                        {item.variant_sku ? `${item.variant_sku} - ` : ""}
                        {item.variant_name}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Tồn trước: <strong>{item.before_stock}</strong> · Thay đổi:{" "}
                    <strong
                      className={
                        Number(item.quantity) >= 0
                          ? "text-green-700"
                          : "text-red-600"
                      }
                    >
                      {Number(item.quantity) >= 0 ? "+" : ""}
                      {item.quantity}
                    </strong>{" "}
                    · Tồn sau: <strong>{item.after_stock}</strong>
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Giá vốn: {formatVnd(item.unit_cost)} · Tổng vốn:{" "}
                    {formatVnd(item.total_cost)}
                  </p>

                  {item.supplier_name && (
                    <p className="mt-1 text-sm text-slate-500">
                      Nhà cung cấp: {item.supplier_name}
                    </p>
                  )}

                  {item.note && (
                    <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-3 text-xs leading-5 text-slate-500">
                      {item.note}
                    </p>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-400">
                  {formatDate(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ProductForm({
  form,
  categories,
  loading,
  submitText,
  mode,
  imageState = { previews: [] },
  existingImages = [],
  variantDrafts = [],
  onSubmit,
  onChange,
  onFilesChange,
  onRemoveNewImage,
  onRemoveExistingImage,
  onGenerateBarcode,
  onAddVariantDraft,
  onUpdateVariantDraft,
  onRemoveVariantDraft,
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Mã sản phẩm *">
          <input
            className={inputClass}
            placeholder="VD: LAN001"
            value={form.code}
            onChange={(event) => onChange("code", event.target.value)}
          />
        </Field>

        <Field label="Tên sản phẩm *">
          <input
            className={inputClass}
            placeholder="VD: Lan hồ điệp"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </Field>

        <Field label="Danh mục">
          <select
            className={inputClass}
            value={form.category_id}
            onChange={(event) => onChange("category_id", event.target.value)}
          >
            <option value="">Chưa chọn</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Đơn vị tính">
          <input
            className={inputClass}
            placeholder="VD: chậu, cây, bó"
            value={form.unit}
            onChange={(event) => onChange("unit", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Giá bán VNĐ">
          <MoneyInput
            value={form.price}
            onChange={(value) => onChange("price", value)}
          />
        </Field>

        <Field label="Giá vốn VNĐ">
          <MoneyInput
            value={form.cost_price}
            onChange={(value) => onChange("cost_price", value)}
          />
        </Field>

        <Field label="Tồn kho">
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="VD: 10"
            value={form.stock}
            onChange={(event) => onChange("stock", event.target.value)}
          />
        </Field>

        <Field label="Tồn tối thiểu">
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="VD: 2"
            value={form.min_stock}
            onChange={(event) => onChange("min_stock", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nhà cung cấp">
          <input
            className={inputClass}
            placeholder="VD: Vườn lan A"
            value={form.supplier_name}
            onChange={(event) => onChange("supplier_name", event.target.value)}
          />
        </Field>

        <BarcodeField
          value={form.barcode}
          onChange={(value) => onChange("barcode", value)}
          onGenerate={onGenerateBarcode}
        />
      </div>

      <ImageUploader
        mode={mode}
        form={form}
        imageState={imageState}
        existingImages={existingImages}
        onChange={onChange}
        onFilesChange={onFilesChange}
        onRemoveNewImage={onRemoveNewImage}
        onRemoveExistingImage={onRemoveExistingImage}
      />

      {mode === "create" && (
        <CreateVariantsEditor
          variants={variantDrafts}
          onAdd={onAddVariantDraft}
          onUpdate={onUpdateVariantDraft}
          onRemove={onRemoveVariantDraft}
        />
      )}

      <Field label="Ghi chú">
        <textarea
          className={`${inputClass} min-h-24`}
          placeholder="Mô tả sản phẩm, size, màu, lưu ý khi bán..."
          value={form.note}
          onChange={(event) => onChange("note", event.target.value)}
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {submitText}
      </button>
    </form>
  );
}

function BarcodeField({ value, onChange, onGenerate }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-slate-500">
        Barcode / Mã quét
      </span>

      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Tự tạo hoặc nhập mã"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />

        <button
          type="button"
          onClick={onGenerate}
          className="shrink-0 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-slate-800"
        >
          Tự tạo
        </button>
      </div>

      {value ? (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
          <BarcodeSvg value={value} />
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-400">
          Nếu để trống, hệ thống sẽ tự tạo barcode theo mã sản phẩm.
        </p>
      )}
    </div>
  );
}

function CreateVariantsEditor({ variants, onAdd, onUpdate, onRemove }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 font-black text-slate-950">
            <Layers size={18} className="text-green-700" />
            Biến thể khi tạo sản phẩm
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tạo nhiều phân loại như size, kích thước chậu, chiều cao cây, màu hoa và màu chậu.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
        >
          <Plus size={16} />
          Thêm biến thể
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
          Chưa có biến thể. Ví dụ: Size S · Chậu 12cm · Cao 30-40cm · Hoa trắng.
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {variants.map((variant, index) => (
            <div
              key={`${variant.sku}-${index}`}
              className="rounded-2xl border border-slate-100 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Biến thể #{index + 1}
                  </p>
                  <p className="mt-1 text-xs font-bold text-green-700">
                    Tên sẽ lưu: {buildVariantDisplayName(variant) || "Chưa đủ thông tin"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded-full bg-red-50 p-2 text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <VariantAttributeFields
                form={variant}
                onChange={(field, value) => onUpdate(index, field, value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantAttributeFields({ form, onChange }) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="SKU / Mã biến thể">
          <input
            className={smallInputClass}
            placeholder="VD: LAN001-V01"
            value={form.sku}
            onChange={(event) => onChange("sku", event.target.value)}
          />
        </Field>

        <Field label="Nhóm biến thể">
          <select
            className={smallInputClass}
            value={form.variant_group || ""}
            onChange={(event) => onChange("variant_group", event.target.value)}
          >
            <option value="">Chọn nhóm</option>
            {VARIANT_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tên thủ công">
          <input
            className={smallInputClass}
            placeholder="VD: Set đặc biệt, bản premium..."
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </Field>

        <Field label="Đơn vị tính">
          <input
            className={smallInputClass}
            placeholder="chậu, cây, bó..."
            value={form.unit}
            onChange={(event) => onChange("unit", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Size">
          <SuggestionInput
            value={form.size_label}
            suggestions={SIZE_SUGGESTIONS}
            placeholder="VD: Size M"
            onChange={(value) => onChange("size_label", value)}
          />
        </Field>

        <Field label="Kích thước chậu">
          <SuggestionInput
            value={form.pot_size}
            suggestions={POT_SIZE_SUGGESTIONS}
            placeholder="VD: Chậu 15cm"
            onChange={(value) => onChange("pot_size", value)}
          />
        </Field>

        <Field label="Chiều cao cây">
          <SuggestionInput
            value={form.plant_height}
            suggestions={PLANT_HEIGHT_SUGGESTIONS}
            placeholder="VD: Cao 40-50cm"
            onChange={(value) => onChange("plant_height", value)}
          />
        </Field>

        <Field label="Màu hoa">
          <SuggestionInput
            value={form.flower_color}
            suggestions={FLOWER_COLOR_SUGGESTIONS}
            placeholder="VD: Hoa trắng"
            onChange={(value) => onChange("flower_color", value)}
          />
        </Field>

        <Field label="Màu chậu">
          <SuggestionInput
            value={form.pot_color}
            suggestions={POT_COLOR_SUGGESTIONS}
            placeholder="VD: Chậu trắng"
            onChange={(value) => onChange("pot_color", value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tồn kho">
          <input
            className={smallInputClass}
            inputMode="numeric"
            placeholder="VD: 10"
            value={form.stock}
            onChange={(event) => onChange("stock", event.target.value)}
          />
        </Field>

        <Field label="Giá bán">
          <MoneyInput
            compact
            value={form.price}
            onChange={(value) => onChange("price", value)}
          />
        </Field>

        <Field label="Giá vốn">
          <MoneyInput
            compact
            value={form.cost_price}
            onChange={(value) => onChange("cost_price", value)}
          />
        </Field>

        <Field label="Tồn tối thiểu">
          <input
            className={smallInputClass}
            inputMode="numeric"
            placeholder="VD: 2"
            value={form.min_stock}
            onChange={(event) => onChange("min_stock", event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function SuggestionInput({ value, suggestions, placeholder, onChange }) {
  return (
    <div>
      <input
        className={smallInputClass}
        placeholder={placeholder}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.slice(0, 6).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onChange(suggestion)}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-green-50 hover:text-green-700"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageUploader({
  mode,
  form,
  imageState,
  existingImages,
  onChange,
  onFilesChange,
  onRemoveNewImage,
  onRemoveExistingImage,
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 font-black text-slate-950">
            <ImagePlus size={18} className="text-green-700" />
            Hình ảnh sản phẩm
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Có thể nhập link ảnh hoặc chọn ảnh trực tiếp từ thiết bị.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white hover:bg-green-800">
          <UploadCloud size={17} />
          Chọn ảnh
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              onFilesChange(mode, event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-3">
        <input
          className={inputClass}
          placeholder="Hoặc dán URL ảnh sản phẩm"
          value={form.image_url}
          onChange={(event) => onChange("image_url", event.target.value)}
        />
      </div>

      {(existingImages.length > 0 || imageState.previews.length > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {existingImages.map((url, index) => (
            <ImagePreview
              key={`${url}-${index}`}
              url={url}
              label="Ảnh hiện có"
              onRemove={() => onRemoveExistingImage(index)}
            />
          ))}

          {imageState.previews.map((preview, index) => (
            <ImagePreview
              key={`${preview.url}-${index}`}
              url={preview.url}
              label="Ảnh mới"
              onRemove={() => onRemoveNewImage(mode, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImagePreview({ url, label, onRemove }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <img src={url} alt={label} className="h-28 w-full object-cover" />

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white"
      >
        <X size={14} />
      </button>

      <div className="px-2 py-1 text-[11px] font-bold text-slate-500">
        {label}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  deleteLoading,
  onEdit,
  onDelete,
  onStockIn,
  onVariants,
  onHistory,
}) {
  const imageUrl = getProductImage(product);
  const stock = Number(product.stock || 0);
  const minStock = Number(product.min_stock || 0);
  const lowStock = stock <= minStock;

  return (
    <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-black text-slate-950">
              {product.code} - {product.name}
            </p>

            {lowStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">
                <AlertTriangle size={13} />
                Sắp hết
              </span>
            )}

            {Number(product.variant_count || 0) > 0 && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">
                {product.variant_count} biến thể
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {product.category_name || "Chưa có danh mục"} · Đơn vị:{" "}
            {product.unit || "sp"}
          </p>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Info label="Giá bán" value={formatVnd(product.price)} />
            <Info label="Giá vốn" value={formatVnd(product.cost_price)} />
            <Info
              label="Lãi dự kiến"
              value={formatVnd(
                Number(product.price || 0) - Number(product.cost_price || 0)
              )}
            />
            <Info
              label="Tồn chính"
              value={`${product.stock || 0} ${product.unit || ""}`}
            />
            <Info
              label="Tồn biến thể"
              value={`${product.variant_stock || 0} ${product.unit || ""}`}
            />
            <Info
              label="Tổng tồn"
              value={`${product.total_stock || product.stock || 0} ${
                product.unit || ""
              }`}
            />
          </div>

          {product.supplier_name && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Nhà cung cấp: {product.supplier_name}
            </p>
          )}

          {product.note && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
              {product.note}
            </p>
          )}

          {product.barcode && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <BarcodeSvg value={product.barcode} height={38} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ActionButton icon={PackagePlus} label="Nhập hàng" onClick={onStockIn} />
        <ActionButton icon={Layers} label="Biến thể" onClick={onVariants} />
        <ActionButton icon={History} label="Lịch sử" onClick={onHistory} />
        <ActionButton icon={Edit3} label="Sửa" onClick={onEdit} />

        <button
          type="button"
          onClick={onDelete}
          disabled={deleteLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
        >
          {deleteLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
          Xóa
        </button>
      </div>
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4">
      <p className="text-xs text-green-50/80">{label}</p>
      <p className="mt-1 break-words text-xl font-black">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
    >
      <Icon size={15} />
      {label}
    </button>
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

function MoneyInput({
  value,
  onChange,
  placeholder = "VD: 180000",
  compact = false,
}) {
  const input = compact ? smallInputClass : inputClass;

  return (
    <div>
      <input
        className={input}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(moneyValue(event.target.value))}
      />
      {value ? (
        <p className="mt-1 text-xs font-bold text-green-700">
          {formatVnd(parseVnd(value))}
        </p>
      ) : null}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-4 shadow-2xl sm:max-w-5xl sm:rounded-[1.75rem] sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <h3 className="text-xl font-black text-slate-950">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function LoadingBox({ text }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-2xl bg-slate-50">
      <div className="text-center">
        <Loader2 className="mx-auto animate-spin text-green-700" />
        <p className="mt-2 text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}
