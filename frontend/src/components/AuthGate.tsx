/**
 * @file AuthGate.tsx
 * @description 登录态守卫组件：包裹需要登录才能访问的内容，按鉴权状态渲染加载中、登录引导或放行子节点
 */
'use client';

import { useAuth } from '@/components/auth-provider';
import { LoginRequired } from '@/components/LoginRequired';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * AuthGate 登录态守卫
 * @param props.children 登录后才渲染的被包裹内容
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const t = useTranslations('common');
  const tErrors = useTranslations('errors');

  if (loading) {
    return (
      // role="status" + aria-busy：让读屏知道这是「正在解析登录态」而非「没有内容」，
      // 否则复用 EmptyState 的空状态语义会读成"此处无数据"
      <div
        role="status"
        aria-busy="true"
        className="flex min-h-[60vh] flex-col items-center justify-center"
      >
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
