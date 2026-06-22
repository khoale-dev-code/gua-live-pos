const API_BASE_URL = "https://provinces.open-api.vn/api/v1";
const CACHE_KEY = "gua-live-pos:vietnam-address:v1-depth3";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function normalizeWard(ward) {
  return {
    code: String(ward.code || ""),
    name: ward.name || "",
    division_type: ward.division_type || "",
    codename: ward.codename || "",
    district_code: String(ward.district_code || ""),
  };
}

function normalizeDistrict(district) {
  return {
    code: String(district.code || ""),
    name: district.name || "",
    division_type: district.division_type || "",
    codename: district.codename || "",
    province_code: String(district.province_code || ""),
    wards: Array.isArray(district.wards)
      ? district.wards
          .map(normalizeWard)
          .filter((ward) => ward.code && ward.name)
      : [],
  };
}

function normalizeProvince(province) {
  return {
    code: String(province.code || ""),
    name: province.name || "",
    division_type: province.division_type || "",
    codename: province.codename || "",
    districts: Array.isArray(province.districts)
      ? province.districts
          .map(normalizeDistrict)
          .filter((district) => district.code && district.name)
      : [],
  };
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cache = JSON.parse(raw);

    if (!cache?.createdAt || Date.now() - cache.createdAt > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return Array.isArray(cache.data) ? cache.data : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        createdAt: Date.now(),
        data,
      })
    );
  } catch {
    // Ignore sessionStorage errors.
  }
}

export async function fetchVietnamAddressTree() {
  const cached = readCache();

  if (cached) {
    return cached;
  }

  const response = await fetch(`${API_BASE_URL}/?depth=3`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Không tải được dữ liệu tỉnh/quận/phường.");
  }

  const payload = await response.json();

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

  const data = rawList
    .map(normalizeProvince)
    .filter((province) => province.code && province.name)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  writeCache(data);

  return data;
}
