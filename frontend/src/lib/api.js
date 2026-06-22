import { clearAuthToken, getAuthToken } from "./authStorage";
const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://gua-live-pos-backend.onrender.com"
).replace(/\/$/, "");

const memoryCache = new Map();
const inflightRequests = new Map();

const CACHE_PREFIX = "gua-live-pos-cache:";

const CACHE_TTL = {
  categories: 5 * 60 * 1000,
  products: 2 * 60 * 1000,
  productDetail: 30 * 1000,
  productVariants: 30 * 1000,
  inventoryHistory: 15 * 1000,

  liveSessions: 15 * 1000,
  liveComments: 1500,

  orders: 15 * 1000,
  orderDetail: 15 * 1000,
  customerByPhone: 60 * 1000,
  customers: 30 * 1000,
};

function buildUrl(path) {
  if (!path.startsWith("/")) {
    return `${API_URL}/${path}`;
  }

  return `${API_URL}${path}`;
}

function getCacheKey(path) {
  return `${CACHE_PREFIX}${path}`;
}

function now() {
  return Date.now();
}

function isCacheFresh(entry) {
  if (!entry) return false;
  return entry.expiresAt > now();
}

function readSessionCache(path) {
  try {
    const raw = sessionStorage.getItem(getCacheKey(path));
    if (!raw) return null;

    const entry = JSON.parse(raw);

    if (!isCacheFresh(entry)) {
      sessionStorage.removeItem(getCacheKey(path));
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

function writeSessionCache(path, entry) {
  try {
    sessionStorage.setItem(getCacheKey(path), JSON.stringify(entry));
  } catch {
    // Ignore storage quota/private mode errors.
  }
}

function writeCache(path, data, ttl = 0, persist = false) {
  if (!ttl || ttl <= 0) return data;

  const entry = {
    data,
    createdAt: now(),
    expiresAt: now() + ttl,
  };

  memoryCache.set(path, entry);

  if (persist) {
    writeSessionCache(path, entry);
  }

  return data;
}

function readCache(path, persist = false) {
  const memoryEntry = memoryCache.get(path);

  if (isCacheFresh(memoryEntry)) {
    return memoryEntry.data;
  }

  if (persist) {
    const sessionEntry = readSessionCache(path);

    if (isCacheFresh(sessionEntry)) {
      memoryCache.set(path, sessionEntry);
      return sessionEntry.data;
    }
  }

  return null;
}

function clearCache(pathPrefix = "") {
  for (const key of Array.from(memoryCache.keys())) {
    if (!pathPrefix || key.startsWith(pathPrefix)) {
      memoryCache.delete(key);
    }
  }

  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);

      if (!key?.startsWith(CACHE_PREFIX)) continue;

      const cleanKey = key.replace(CACHE_PREFIX, "");

      if (!pathPrefix || cleanKey.startsWith(pathPrefix)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore sessionStorage errors.
  }
}

async function readApiError(response) {
  const fallbackMessage = `API lá»—i ${response.status}`;

  try {
    const payload = await response.json();

    if (typeof payload?.detail === "string") {
      return payload.detail;
    }

    if (Array.isArray(payload?.detail)) {
      return payload.detail
        .map((item) => item?.msg || JSON.stringify(item))
        .join("\n");
    }

    if (payload?.message) {
      return payload.message;
    }

    return JSON.stringify(payload);
  } catch {
    try {
      const text = await response.text();
      return text || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
}

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
  } = options;

  const authToken = getAuthToken();

  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(getAuthToken()
        ? {
            Authorization: `Bearer ${getAuthToken()}`,
          }
        : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
      if (response.status === 401 && path !== "/api/auth/login") {
        clearAuthToken();

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }

    throw new Error(await readApiError(response));
  }

  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function cachedGet(path, options = {}) {
  const {
    ttl = 0,
    persist = false,
    force = false,
  } = options;

  if (!force) {
    const cached = readCache(path, persist);

    if (cached) {
      return cached;
    }
  }

  if (inflightRequests.has(path)) {
    return inflightRequests.get(path);
  }

  const promise = request(path)
    .then((data) => writeCache(path, data, ttl, persist))
    .finally(() => {
      inflightRequests.delete(path);
    });

  inflightRequests.set(path, promise);

  return promise;
}

export const api = {
  getCustomers: (options = {}) =>
    cachedGet("/api/customers", {
      ttl: CACHE_TTL.customers,
      persist: false,
      ...options,
    }),

  refreshCustomers: () =>
    cachedGet("/api/customers", {
      ttl: CACHE_TTL.customers,
      persist: false,
      force: true,
    }),

  getDashboardAnalytics: () => request("/api/dashboard/analytics"),

  refreshDashboardAnalytics: () => request("/api/dashboard/analytics"),

  getCategories: (options = {}) =>
    cachedGet("/api/categories", {
      ttl: CACHE_TTL.categories,
      persist: true,
      ...options,
    }),

  refreshCategories: () =>
    cachedGet("/api/categories", {
      ttl: CACHE_TTL.categories,
      persist: true,
      force: true,
    }),

  createCategory: async (payload) => {
    const data = await request("/api/categories", {
      method: "POST",
      body: payload,
    });

    clearCache("/api/categories");
    return data;
  },

  updateCategory: async (categoryId, payload) => {
    const data = await request(`/api/categories/${categoryId}`, {
      method: "PUT",
      body: payload,
    });

    clearCache("/api/categories");
    return data;
  },

  deleteCategory: async (categoryId) => {
    const data = await request(`/api/categories/${categoryId}`, {
      method: "DELETE",
    });

    clearCache("/api/categories");
    return data;
  },

  getProducts: (options = {}) =>
    cachedGet("/api/products", {
      ttl: CACHE_TTL.products,
      persist: true,
      ...options,
    }),

  refreshProducts: () =>
    cachedGet("/api/products", {
      ttl: CACHE_TTL.products,
      persist: true,
      force: true,
    }),

  getProductById: (productId, options = {}) =>
    cachedGet(`/api/products/${productId}`, {
      ttl: CACHE_TTL.productDetail,
      persist: false,
      ...options,
    }),

  createProduct: async (payload) => {
    const data = await request("/api/products", {
      method: "POST",
      body: payload,
    });

    clearCache("/api/products");
    return data;
  },

  updateProduct: async (productId, payload) => {
    const data = await request(`/api/products/${productId}`, {
      method: "PUT",
      body: payload,
    });

    clearCache("/api/products");
    return data;
  },

  deleteProduct: async (productId) => {
    const data = await request(`/api/products/${productId}`, {
      method: "DELETE",
    });

    clearCache("/api/products");
    return data;
  },

  getProductVariants: (productId, options = {}) =>
    cachedGet(`/api/products/${productId}/variants`, {
      ttl: CACHE_TTL.productVariants,
      persist: false,
      ...options,
    }),

  createProductVariant: async (productId, payload) => {
    const data = await request(`/api/products/${productId}/variants`, {
      method: "POST",
      body: payload,
    });

    clearCache("/api/products");
    return data;
  },

  updateProductVariant: async (productId, variantId, payload) => {
    const data = await request(`/api/products/${productId}/variants/${variantId}`, {
      method: "PUT",
      body: payload,
    });

    clearCache("/api/products");
    return data;
  },

  deleteProductVariant: async (productId, variantId) => {
    const data = await request(`/api/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
    });

    clearCache("/api/products");
    return data;
  },

  stockInProduct: async (productId, payload) => {
    const data = await request(`/api/products/${productId}/stock-in`, {
      method: "POST",
      body: payload,
    });

    clearCache("/api/products");
    return data;
  },

  adjustProductStock: async (productId, payload) => {
    const data = await request(`/api/products/${productId}/stock-adjust`, {
      method: "POST",
      body: payload,
    });

    clearCache("/api/products");
    return data;
  },

  getProductInventoryHistory: (productId, options = {}) =>
    cachedGet(`/api/products/${productId}/inventory-history`, {
      ttl: CACHE_TTL.inventoryHistory,
      persist: false,
      ...options,
    }),

  getAllInventoryHistory: (options = {}) =>
    cachedGet("/api/products/inventory/history", {
      ttl: CACHE_TTL.inventoryHistory,
      persist: false,
      ...options,
    }),

  getLiveSessions: (options = {}) =>
    cachedGet("/api/live-sessions", {
      ttl: CACHE_TTL.liveSessions,
      persist: false,
      ...options,
    }),

  refreshLiveSessions: () =>
    cachedGet("/api/live-sessions", {
      ttl: CACHE_TTL.liveSessions,
      persist: false,
      force: true,
    }),

  connectFacebookLive: async (payload = {}) => {
    const data = await request("/api/live-sessions/connect/facebook", {
      method: "POST",
      body: payload,
    });

    clearCache("/api/live-sessions");
    return data;
  },

  connectTiktokLive: async (payload = {}) => {
    const data = await request("/api/live-sessions/connect/tiktok", {
      method: "POST",
      body: payload,
    });

    clearCache("/api/live-sessions");
    return data;
  },

  getLiveComments: (sessionId, options = {}) =>
    cachedGet(`/api/live-sessions/${sessionId}/comments`, {
      ttl: CACHE_TTL.liveComments,
      persist: false,
      ...options,
    }),

  refreshLiveComments: (sessionId) =>
    cachedGet(`/api/live-sessions/${sessionId}/comments`, {
      ttl: CACHE_TTL.liveComments,
      persist: false,
      force: true,
    }),

  getOrders: (options = {}) =>
    cachedGet("/api/orders", {
      ttl: CACHE_TTL.orders,
      persist: false,
      ...options,
    }),

  refreshOrders: () =>
    cachedGet("/api/orders", {
      ttl: CACHE_TTL.orders,
      persist: false,
      force: true,
    }),

  getOrderById: (orderId, options = {}) =>
    cachedGet(`/api/orders/${orderId}`, {
      ttl: CACHE_TTL.orderDetail,
      persist: false,
      ...options,
    }),

  createOrderFromComment: async (payload) => {
    const data = await request("/api/orders/from-comment", {
      method: "POST",
      body: payload,
    });

    clearCache("/api/orders");
    clearCache("/api/products");
    clearCache("/api/live-sessions");
    return data;
  },

  updateOrderStatus: async (orderId, payload) => {
    const data = await request(`/api/orders/${orderId}/status`, {
      method: "PUT",
      body: payload,
    });

    clearCache("/api/orders");
    return data;
  },

  deleteOrder: async (orderId) => {
    const data = await request(`/api/orders/${orderId}`, {
      method: "DELETE",
    });

    clearCache("/api/orders");
    clearCache("/api/products");
    clearCache("/api/live-sessions");
    return data;
  },

  markOrderItemPrinted: async (orderId, itemId) => {
    const data = await request(`/api/orders/${orderId}/items/${itemId}/print`, {
      method: "POST",
      body: {},
    });

    clearCache("/api/orders");
    return data;
  },

  getCustomerByPhone: (phone, options = {}) =>
    cachedGet(`/api/orders/customer-by-phone/${encodeURIComponent(phone)}`, {
      ttl: CACHE_TTL.customerByPhone,
      persist: false,
      ...options,
    }),

  getLiveEvents: (options = {}) =>
    cachedGet("/api/live-events", {
      ttl: CACHE_TTL.liveSessions || 15000,
      persist: false,
      ...options,
    }),

  getActiveLiveEvent: async () => {
    const data = await request("/api/live-events/active", {
      method: "POST",
      body: {},
    });

    clearCache("/api/live-events");
    return data;
  },

  createLiveEvent: async (payload) => {
    const data = await request("/api/live-events", {
      method: "POST",
      body: payload,
    });

    clearCache("/api/live-events");
    return data;
  },

  attachActiveSessionsToLiveEvent: async (eventId) => {
    const data = await request(`/api/live-events/${eventId}/attach-active-sessions`, {
      method: "POST",
      body: {},
    });

    clearCache("/api/live-events");
    return data;
  },

  getLiveEventComments: (eventId, options = {}) =>
    cachedGet(`/api/live-events/${eventId}/comments`, {
      ttl: CACHE_TTL.liveComments || 1500,
      persist: false,
      ...options,
    }),

  refreshLiveEventComments: (eventId) =>
    cachedGet(`/api/live-events/${eventId}/comments`, {
      ttl: CACHE_TTL.liveComments || 1500,
      persist: false,
      force: true,
    }),

  endLiveEvent: async (eventId) => {
    const data = await request(`/api/live-events/${eventId}/end`, {
      method: "PUT",
      body: {},
    });

    clearCache("/api/live-events");
    return data;
  },

  clearCache,
};


api.login = (data) =>
  request("/api/auth/login", {
    method: "POST",
    body: data,
  });

api.me = () => request("/api/auth/me");


api.updateCustomer = async (customerPhone, payload) => {
  const data = await request(`/api/customers/${encodeURIComponent(customerPhone)}`, {
    method: "PUT",
    body: payload,
  });

  clearCache("/api/customers");
  clearCache("/api/orders");
  return data;
};


api.getLiveGameParticipants = (sessionId) =>
  request(`/api/live-games/${encodeURIComponent(sessionId)}/participants`);

api.getLiveGameDraws = (sessionId) =>
  request(`/api/live-games/${encodeURIComponent(sessionId)}/draws`);

api.drawLiveGameWinner = async (sessionId, payload) => {
  const data = await request(`/api/live-games/${encodeURIComponent(sessionId)}/draw`, {
    method: "POST",
    body: payload,
  });

  clearCache("/api/live-sessions");
  return data;
};


api.getLiveGameSessions = () =>
  request("/api/live-games/sessions");

