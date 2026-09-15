/**
 * @file AuthGate.tsx
 * @description dashboard 布局客户端鉴权守卫，替代服务端 getCurrentUser() 鉴权；加载中显示空状态骨架，未登录渲染 LoginRequired，已登录渲染子页面
 */
'use client';

import { useAuth } from '@/components/auth-provider';
import { LoginRequired } from '@/components/LoginRequired';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * AuthGate 鉴权守卫
 * 在 dashboard 布局中替代服务端 getCurrentUser() 鉴权，不再调用 cookies() → layout 段可静态缓存（ISR/Full Route Cache），认证检查在客户端 useAuth() 完成，避免每请求 SSR 鉴权；加载中显示空状态骨架，未登录渲染 LoginRequired，已登录渲染子页面
 * @param props 组件入参
 * @param props.children 受保护的子页面内容
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const t = useTranslations('common');
  const tErrors = useTranslations('errors');

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        {/* 鉴权加载中，显示空状态骨架 */}
        <EmptyState
          icon={<UserCircle size={20} strokeWidth={2.5} />}
          title={t('loading')}
          description={t('verifyingAuth')}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginRequired
        icon={<UserCircle size={20} strokeWidth={2.5} />}
        description={tErrors('dashboardLoginDesc')}
      />
    );
  }

  return <>{children}</>;
}