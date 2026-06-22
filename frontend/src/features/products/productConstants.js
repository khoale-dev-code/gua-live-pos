export const EMPTY_PRODUCT_FORM = {
  code: "",
  name: "",
  category_id: "",
  price: "",
  cost_price: "",
  stock: "",
  min_stock: "",
  unit: "chậu",
  supplier_name: "",
  barcode: "",
  image_url: "",
  note: "",
};

export const EMPTY_VARIANT_FORM = {
  sku: "",
  name: "",
  variant_group: "",
  size_label: "",
  pot_size: "",
  plant_height: "",
  flower_color: "",
  pot_color: "",
  unit: "chậu",
  price: "",
  cost_price: "",
  stock: "",
  min_stock: "",
};

export const EMPTY_STOCK_FORM = {
  variant_id: "",
  quantity: "",
  unit_cost: "",
  supplier_name: "",
  note: "",
};

export const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100";

export const smallInputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100";
