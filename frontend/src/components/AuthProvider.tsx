"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@my-app/shared";
import { getMeAction } from "@server/auth/auth.controller";
import { clearAuthStatus, hasAuthStatus, wasLogoutSignaled } from "@/lib/authStatus";

const USER_CACHE_KEY = "auth_user_cache";

const PLACEHOLDER_ROLE = "Writer";

type CachedUser = Omit<User, "role">;

function readCachedUser(): User | null {
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    // ponytail: 缓存是一份本地可写的 JSON 镜像，因此绝不从它读取任何权限字段。
    // role 先用占位值渲染（仅影响首屏一个标签），真实值由 refreshMe() 从服务端覆盖。
    const parsed = JSON.parse(raw) as CachedUser;
    return { ...parsed, role: PLACEHOLDER_ROLE };
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null): void {
  try {
    if (user) {
      // ponytail: 不把 role 写进缓存 —— 否则 UI 的门槛就等于「改一行 localStorage」。
      const { role: _role, ...cacheable } = user;
      void _role;
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheable));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {}
}

interface AuthContextValue {
  user: User | null;

  loading: boolean;

  refreshMe: () => Promise<void>;

  setMe: (user: User | null) => void;

  patchMe: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next: User | null) => {
    setUser(next);
    writeCachedUser(next);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const result = await getMeAction();
      if (result.ok) {
        applyUser(result.data.user);
      } else if (result.status === 401) {
        applyUser(null);
        clearAuthStatus();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production")
        console.error("[AuthProvider] refreshMe failed", err);
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    if (!hasAuthStatus()) {
      applyUser(null);
      setLoading(false);
    } else {
      const cached = readCachedUser();
      if (cached) {
        setUser(cached);
        setLoading(false);
      }
      refreshMe();
    }

    const syncLogout = (e: StorageEvent) => {
      if (wasLogoutSignaled(e)) applyUser(null);
    };
    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, [refreshMe, applyUser]);

  const setMe = applyUser;

  const patchMe = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      writeCachedUser(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, loading, refreshMe, setMe, patchMe }),
    [user, loading, refreshMe, setMe, patchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
