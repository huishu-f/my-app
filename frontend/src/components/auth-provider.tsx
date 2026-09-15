/**
 * @file auth-provider.tsx
 * @description 登录态全局 Context — 以原生 React Context + fetch 管理当前用户（me）。
 *              挂载时依据 auth_status cookie 决定是否拉取（游客不发请求），
 *              登录/登出/资料变更后由调用方通过 refreshMe / setMe / patchMe 同步，
 *              全站即时响应
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@my-app/shared';
import { authApi } from '@/services/auth/api';
import { clearAuthStatus, hasAuthStatus, wasLogoutSignaled } from '@/lib/auth-status';

/**
 * Auth Context 值
 */
export interface AuthContextValue {
  /** 当前登录用户，未登录为 null */
  user: User | null;
  /** 初始探测中（首帧渲染前可能为 true） */
  loading: boolean;
  /** 强制重新获取当前用户（登录、资料更新后调用） */
  refreshMe: () => Promise<void>;
  /** 直接设置用户（登出、改密后置 null） */
  setMe: (user: User | null) => void;
  /** 本地局部修正用户字段（点赞/收藏后零请求更新 likedArticles 等） */
  patchMe: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider 登录态 Provider，挂载时仅当 auth_status cookie 存在才请求 /auth/me（避免游客 401）；401/403 一律视为游客态；storage 事件同步多标签页登出
 * @returns 渲染包裹 children 的登录态 Context Provider
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 拉取当前用户：失败（含 401）视为游客态，不抛出，清除残留 auth_status cookie
   */
  const refreshMe = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
    } catch {
      setUser(null);
      clearAuthStatus();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 游客无 auth_status cookie：不发请求，直接就绪
    if (hasAuthStatus()) {
      refreshMe();
    } else {
      setLoading(false);
    }

    // 多标签页登出同步：其他标签页 clearAuthStatus 写 localStorage 信号 → storage 事件 → 本标签页回游客态
    const syncLogout = (e: StorageEvent) => {
      if (wasLogoutSignaled(e)) setUser(null);
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时探测一次
  }, []);

  /**
   * 直接设置用户（null = 游客态）
   * @param next 最新用户信息，null 表示游客态
   */
  const setMe = useCallback((next: User | null) => {
    setUser(next);
  }, []);

  /**
   * 局部修正用户字段（仅已登录时有意义）
   * @param partial 待合并更新的用户字段
   */
  const patchMe = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, loading, refreshMe, setMe, patchMe }),
    [user, loading, refreshMe, setMe, patchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — 读取登录态 Context
 * @returns {@link AuthContextValue}
 * @throws 在 AuthProvider 外使用时报错（Provider 已在根布局 providers 挂载）
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
