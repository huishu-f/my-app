/**
 * @file 客户端鉴权守卫 Hook
 * @description 为需要登录才能触发的写操作（评论、点赞、收藏等）提供统一守卫：
 *              未登录时 toast 提示并携带来源路径跳转登录页，已登录时直接执行业务动作。
 */
'use client';
import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { buildLoginRedirect } from '@/lib/navigation';
import type { User } from '@my-app/shared';

/**
 * 鉴权守卫 Hook
 * @param user 当前用户（null 表示未登录）
 * @param redirectPath 登录成功后的重定向路径
 * @returns requireAuth 守卫函数——未登录时 toast 提示并跳转登录页，已登录时执行传入的 action
 * @example
 * const requireAuth = useRequireAuth(user, `/posts/${postId}`);
 * requireAuth(() => startEditing());
 */
export function useRequireAuth(user: User | null, redirectPath: string) {
  const router = useRouter();
  const t = useTranslations('common');
  /**
   * 鉴权守卫函数
   * @param action 已登录时执行的业务动作
   * @returns 无返回值（通过 action 或跳转产生副作用）
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
