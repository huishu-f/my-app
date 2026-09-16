/**
 * @file LoginRequired.tsx
 * @description 未登录引导组件，展示登录提示并引导跳转登录页。
 *              客户端组件 — 用 usePathname() 获取当前路径作为 redirect 参数，
 *              避免服务端 headers() 无法可靠获取请求路径的问题
 */
'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Container } from './ui/Container';
import { EmptyState } from './ui/EmptyState';
import { Button } from './ui/Button';
import { buildLoginRedirect } from '@/lib/navigation';

/**
 * LoginRequired 组件入参
 */
interface LoginRequiredProps {
  /** 提示图标 */
  icon: ReactNode;
  /** 提示描述文案 */
  description: string;
}

/**
 * LoginRequired 未登录引导
 * @param props {@link LoginRequiredProps}
 */
export function LoginRequired({ icon, description }: LoginRequiredProps) {
  const pathname = usePathname() || '/';
  const t = useTranslations('common');
  return (
    <Container className="page-section">
      <EmptyState
        icon={icon}
        title={t('loginRequired')}
        description={description}
        action={
          <Button href={buildLoginRedirect(pathname)}>
            {t('goLogin')}
          </Button>
        }
      />
    </Container>
  );
}
