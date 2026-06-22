const AUTH_TOKEN_KEY = "gua_live_pos_access_token";
const AUTH_USER_KEY = "gua_live_pos_user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (!user) return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
