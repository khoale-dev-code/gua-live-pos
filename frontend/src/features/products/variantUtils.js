export const VARIANT_GROUPS = [
  "Kích thước",
  "Màu hoa",
  "Màu chậu",
  "Chiều cao cây",
  "Loại chậu",
  "Combo",
];

export const SIZE_SUGGESTIONS = ["Size S", "Size M", "Size L", "Mini", "Lớn"];

export const POT_SIZE_SUGGESTIONS = [
  "Chậu 10cm",
  "Chậu 12cm",
  "Chậu 15cm",
  "Chậu 18cm",
  "Chậu D20",
  "Chậu D25",
];

export const PLANT_HEIGHT_SUGGESTIONS = [
  "Cao 20-30cm",
  "Cao 30-40cm",
  "Cao 40-50cm",
  "Cao 50-60cm",
  "Cao trên 60cm",
];

export const FLOWER_COLOR_SUGGESTIONS = [
  "Hoa trắng",
  "Hoa vàng",
  "Hoa hồng",
  "Hoa tím",
  "Hoa đỏ",
  "Hoa xanh",
  "Hoa mix màu",
];

export const POT_COLOR_SUGGESTIONS = [
  "Chậu trắng",
  "Chậu đen",
  "Chậu xanh",
  "Chậu nâu",
  "Chậu đất nung",
  "Chậu trong suốt",
];

export function buildVariantDisplayName(form = {}) {
  const manualName = String(form.name || "").trim();

  if (manualName) {
    return manualName;
  }

  const parts = [
    form.size_label,
    form.pot_size,
    form.plant_height,
    form.flower_color,
    form.pot_color,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return parts.join(" · ");
}

export function hasVariantInfo(form = {}) {
  return Boolean(buildVariantDisplayName(form));
}
