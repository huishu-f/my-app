/**
 * @file AuthGuard.tsx
 * @description (auth) 路由组客户端守卫：已登录时阻止访问登录/注册页并延时跳转；会话校验中展示 loading 占位
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/ui/Spinner';
import { safeRedirect, stripLocalePrefix } from '@/lib/navigation';

/**
 * 登录态守卫：未登录放行 children（登录/注册页），已登录不渲染任何内容并等待跳转
 * @param props children 为被包裹的 (auth) 页面内容
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  /** 当前登录用户与会话校验中状态（来自 AuthProvider） */
  const { user, loading } = useAuth();

  const router = useRouter();

  const t = useTranslations('common');

  /**
   * 监听 user/router：已登录时读取 URL 的 redirect 参数并跳出登录页
   * safeRedirect 仅放行站内相对路径（拦截 // 开头与登录/注册页），防开放重定向；
   * 剥掉 locale 前缀后再交给 next-intl 路由——localePrefix:'always' 下它会自动补当前语言前缀，
   * 传入带前缀路径会被二次拼接成 /zh/zh/write
   */
  useEffect(() => {
    if (!user) return;

    const raw = new URLSearchParams(window.location.search).get('redirect') || '/';
    const safe = stripLocalePrefix(safeRedirect(raw));
    // 延时 500ms（单位 ms）后再 replace；卸载时清掉定时器，避免过期跳转
    const timer = setTimeout(() => router.replace(safe), 500);
    return () => clearTimeout(timer);
  }, [user, router]);

  /** 会话状态未确定（如刷新页面校验 Cookie 中）：整页居中占位 */
  if (loading) {
    return (
      // role="status" + aria-busy：读屏需知道这是「正在校验登录态」的过程态而非终态；
      // 可见部分只有一个装饰性转圈（Spinner 自身 aria-hidden），故补 sr-only 文案作为唯一可读内容
      <div
        role="status"
        aria-busy="true"
        className="flex min-h-[60vh] flex-col items-center justify-center"
      >
        <Spinner size="lg" className="opacity-40" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }

  /** 已登录：不渲染登录/注册表单（等待跳转期间返回 null，避免闪烁可交互表单） */
  if (user) return null;

  /** 未登录：放行登录/注册页面 */
  return <>{children}</>;
}
