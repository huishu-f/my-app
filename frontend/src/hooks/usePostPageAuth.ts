/**
 * @file 文章详情页鉴权 Hook
 * @description 文章详情页专用的鉴权 + 状态三合一 Hook，聚合：
 *              useCurrentUser（客户端登录态优先 + SSR 兜底）、
 *              usePostState（文章展示态提升）、useRequireAuth（未登录引导登录），
 *              收敛详情页多个区块的重复三件套调用。
 */
'use client';

import { useCurrentUser } from './useCurrentUser';
import { usePostState, type PostStateValue } from '@/app/[locale]/posts/[id]/_components/PostStateProvider';
import { useRequireAuth } from './useRequireAuth';
import type { User } from '@my-app/shared';

/** usePostPageAuth 返回的上下文 */
export interface PostPageAuthContext extends PostStateValue {
  /** 当前用户（null 表示未登录游客） */
  user: User | null;
  /** 鉴权守卫：未登录时提示并跳转登录页，已登录时执行传入的 action */
  requireAuth: (action: () => void) => void;
}

/**
 * 文章详情页鉴权 + 状态三合一 Hook
 * @param postId 文章 ID（用于 requireAuth 登录后的回跳路径）
 * @param ssrUser SSR 传入的用户（详情页静态化后可能为 null）
 * @returns {@link PostPageAuthContext} user / post / updatePost / requireAuth
 * @example
 * const { user, post, updatePost, requireAuth } = usePostPageAuth(postId, ssrUser);
 */
export function usePostPageAuth(postId: string, ssrUser?: User | null): PostPageAuthContext {
  const user = useCurrentUser(ssrUser);
  const { post, updatePost } = usePostState();
  const requireAuth = useRequireAuth(user, `/posts/${postId}`);

  return { user, post, updatePost, requireAuth };
}
