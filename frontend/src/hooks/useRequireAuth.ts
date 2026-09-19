/**
 * @file useRequireAuth.ts
 * @description 登录守卫 Hook：返回一个动作包装器，未登录时提示并跳转登录页（携带回跳地址），已登录时执行原操作
 */
'use client';
import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { buildLoginRedirect } from '@/lib/navigation';
import type { User } from '@my-app/shared';

/**
 * 生成"需登录"动作守卫
 * @param user 当前用户，null 表示未登录
 * @param redirectPath 登录成功后要回跳的目标路径（不含 locale 前缀）
 * @returns 记忆化的守卫函数：接收 action，未登录则提示并跳转登录页，已登录则执行 action
 * @example
 * const requireAuth = useRequireAuth(user, `/posts/${id}`);
 * requireAuth(() => toggleLike());
 */
export function useRequireAuth(user: User | null, redirectPath: string) {
  const router = useRouter();
  // common 命名空间文案，用于未登录提示
  const t = useTranslations('common');

  /**
   * 守卫实现：未登录时弹提示并跳转登录页（redirect 指向目标路径），已登录时执行传入 action
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
