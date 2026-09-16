/**
 * @file AuthGuard.tsx
 * @description (auth) 路由组客户端鉴权守卫，未登录用户访问登录/注册页时客户端重定向首页；layout 不再调用 cookies()，可被 ISR/Full Route Cache 缓存
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';

/**
 * AuthGuard 客户端鉴权守卫（认证路由组）
 * 已登录用户访问 /login /register 时客户端重定向首页，layout 不再调用 cookies() → 可被 ISR/Full Route Cache 缓存，loading 中显示骨架避免表单闪现
 * @param props 组件入参
 * @param props.children 受保护的登录/注册页面内容
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  /**
   * 已登录用户访问登录/注册页时，延迟重定向回来源页
   */
  useEffect(() => {
    if (!user) return;
    // 已登录访问登录/注册页：优先跳回来源页（redirect 参数）。
    // 延迟 500ms 执行：登录成功时先让登录页的 router.push(redirect) 完成导航，
    // 本组件随 (auth) 布局卸载并清除定时器，避免双导航竞争互相抵消；
    // 若 push 被表单提交的 transition 吞掉，则由这里的延迟跳转兜底
    const raw = new URLSearchParams(window.location.search).get('redirect') || '/';
    const safe =
      raw.startsWith('/') && !raw.startsWith('//') && !['/login', '/register'].includes(raw)
        ? raw
        : '/';
    const timer = setTimeout(() => router.replace(safe), 500);
    return () => clearTimeout(timer);
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        {/* 鉴权加载中，显示加载骨架避免表单闪现 */}
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
