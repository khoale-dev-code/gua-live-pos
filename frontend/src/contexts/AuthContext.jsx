import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import {
  clearAuthToken,
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
} from "../lib/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));

  const isAuthenticated = Boolean(getAuthToken());

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const token = getAuthToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.me();

        if (!mounted) return;

        if (data?.user) {
          setUser(data.user);
          setStoredUser(data.user);
        }
      } catch {
        clearAuthToken();

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function login(username, password) {
    const data = await api.login({
      username,
      password,
    });

    setAuthToken(data.access_token);
    setStoredUser(data.user);
    setUser(data.user);

    return data;
  }

  function logout() {
    clearAuthToken();
    setUser(null);
    window.location.href = "/login";
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      logout,
    }),
    [user, loading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
