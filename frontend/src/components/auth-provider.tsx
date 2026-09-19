/**
 * @file auth-provider.tsx
 * @description 全局登录态 Provider：挂载时按本地登录标记拉取当前用户，向子树共享 user/loading 与刷新/更新方法，并监听跨标签页登出
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@my-app/shared';
import { authApi } from '@/services/auth/api';
import { clearAuthStatus, hasAuthStatus, wasLogoutSignaled } from '@/lib/auth-status';

/**
 * 认证 Context 暴露给消费方的值
 */
export interface AuthContextValue {
  /** 当前登录用户，未登录为 null */
  user: User | null;

  /** 是否正在校验/拉取登录态，初始为 true */
  loading: boolean;

  /** 重新向后端拉取当前用户并刷新 user（失败时置空并清理本地登录标记） */
  refreshMe: () => Promise<void>;

  /** 直接用给定用户覆盖登录态（如登录成功后写入） */
  setMe: (user: User | null) => void;

  /** 局部合并更新当前用户字段，无 user 时忽略 */
  patchMe: (partial: Partial<User>) => void;
}

/** 认证 Context，未包裹 Provider 时为 null，供 useAuth 做守卫判断 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider 登录态提供者
 * @param props.children 需要共享登录态的子树
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  /** 当前登录用户，null 表示未登录 */
  const [user, setUser] = useState<User | null>(null);

  /** 登录态是否仍在初始化，默认 true 以先展示校验中 */
  const [loading, setLoading] = useState(true);

  /**
   * 拉取当前登录用户：成功写入 user，失败则置空并清理本地登录标记；无论结果都结束 loading
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

  /**
   * 仅在挂载时执行一次：
   * - 有本地登录标记才发起 refreshMe，否则直接结束 loading（避免未登录用户无谓请求 me 接口）
   * - 注册 storage 事件监听其它标签页的登出，实现跨标签同步登录态；卸载时移除监听
   */
  useEffect(() => {
    if (hasAuthStatus()) {
      refreshMe();
    } else {
      setLoading(false);
    }

    /** 其它标签页写入登出标记时，本标签页同步清空 user */
    const syncLogout = (e: StorageEvent) => {
      if (wasLogoutSignaled(e)) setUser(null);
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
    // refreshMe 由 useCallback([]) 定义，身份恒定，加入依赖不改变「仅挂载时执行一次」的语义
  }, [refreshMe]);

  /** 直接以给定用户覆盖登录态，供登录/登出流程调用 */
  const setMe = useCallback((next: User | null) => {
    setUser(next);
  }, []);

  /** 局部合并更新当前用户字段；无 user 时保持原状，避免把 null 展开成对象 */
  const patchMe = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  /** 缓存 Context value，避免每次渲染生成新对象导致消费方无谓重渲染 */
  const value = useMemo(
    () => ({ user, loading, refreshMe, setMe, patchMe }),
    [user, loading, refreshMe, setMe, patchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 读取全局登录态
 * @returns {@link AuthContextValue} 当前用户、加载标记与刷新/更新方法
 * @throws 当在 AuthProvider 之外调用（Context 为 null）时抛错
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
