export function formatVnd(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

export function parseMoney(value) {
  return Number(String(value || "").replace(/[^\d]/g, "") || 0);
}

export function formatTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export function getPlatformLabel(platform) {
  const value = String(platform || "").toLowerCase();

  if (value === "facebook") return "Facebook";
  if (value === "tiktok") return "TikTok";

  return platform || "Không rõ";
}

export function getPlatformClass(platform) {
  const value = String(platform || "").toLowerCase();

  if (value === "facebook") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (value === "tiktok") {
    return "bg-slate-950 text-white ring-slate-800";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function buildCustomerAddress(customer = {}) {
  return [
    customer.address_detail,
    customer.ward,
    customer.district,
    customer.province,
    customer.address,
  ]
    .filter(Boolean)
    .join(", ");
}

export function normalizePhone(value = "") {
  const phone = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  if (phone.startsWith("+84")) {
    return `0${phone.slice(3)}`;
  }

  return phone;
}


export function formatDateLabel(value) {
  if (!value) return "Hôm nay";

  try {
    const date = new Date(value);

    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Hôm nay";
  }
}

export function isSameVietnamDate(value) {
  if (!value) return true;

  try {
    const target = new Date(value).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

    const today = new Date().toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

    return target === today;
  } catch {
    return true;
  }
}
