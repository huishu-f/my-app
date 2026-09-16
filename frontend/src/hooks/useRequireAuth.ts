/**
 * @file useRequireAuth.ts
 * @description 客户端鉴权守卫 Hook，未登录时提示并携带来源路径跳转登录页，已登录时执行回调操作；供需要登录后才能触发的写操作使用
 */

'use client';
import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { buildLoginRedirect } from '@/lib/navigation';
import type { User } from '@my-app/shared';

/**
 * 鉴权守卫 Hook，未登录时提示并跳转登录页
 * @param user 当前用户（null 表示未登录）
 * @param redirectPath 登录后重定向路径
 * @returns requireAuth 函数，未登录时提示并跳转，已登录时执行传入的 action
 */
export function useRequireAuth(user: User | null, redirectPath: string) {
  const router = useRouter();
  const t = useTranslations('common');
  /**
   * 鉴权校验回调
   * @param action 需要登录后执行的动作
   */
  return useCallback(
    (action: () => void) => {
      if (!user) {
        toast.info(t('loginRequired'));
        router.push(buildLoginRedirect(redirectPath));
        return;
      }
      action();
    },
    [user, redirectPath, router, t],
  );
}
