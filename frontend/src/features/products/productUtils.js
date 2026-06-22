export function formatVnd(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

export function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

export function parseVnd(value) {
  const number = String(value || "").replace(/[^\d]/g, "");
  return Number(number || 0);
}

export function toNumber(value) {
  return Number(String(value || "").replace(/[^\d-]/g, "") || 0);
}

export function moneyValue(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

export function getProductImage(product) {
  return product?.image_url || product?.images?.[0]?.image_url || "";
}

export function buildImagePreview(file) {
  return {
    file,
    url: URL.createObjectURL(file),
    name: file.name,
  };
}

export function normalizeImageUrls(urls = []) {
  return urls
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.image_url || "";
    })
    .filter(Boolean);
}
