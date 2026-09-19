/**
 * @file LoginRequired.tsx
 * @description 登录引导页组件：未登录时展示提示图标、文案与"去登录"按钮，并携带当前路径以便登录后回跳
 */
'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Container } from '@/ui/Container';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';
import { buildLoginRedirect } from '@/lib/navigation';

/**
 * LoginRequired 组件入参
 */
interface LoginRequiredProps {
  /** 提示区图标元素 */
  icon: ReactNode;

  /** 引导说明文案 */
  description: string;
}

/**
 * LoginRequired 登录引导页
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
        action={<Button href={buildLoginRedirect(pathname)}>{t('goLogin')}</Button>}
      />
    </Container>
  );
}
