/**
 * @file usePostPageAuth.ts
 * @description 文章详情页专用的鉴权 + 状态 hook，聚合三个重复模式：
 *              useCurrentUser（me ?? ssrUser 兜底）+ usePostState（展示态提升）+
 *              useRequireAuth（未登录引导）。消除 PostActions / CommentsSection 的三件套重复。
 */
'use client';

import { useCurrentUser } from './useCurrentUser';
import { usePostState, type PostStateValue } from '@/app/posts/[id]/_components/PostStateProvider';
import { useRequireAuth } from './useRequireAuth';
import type { User } from '@my-app/shared';

/** usePostPageAuth 返回的上下文 */
export interface PostPageAuthContext extends PostStateValue {
  /** 当前用户（null 表示未登录） */
  user: User | null;
  /** 鉴权守卫：未登录时提示并跳转，已登录时执行传入的 action */
  requireAuth: (action: () => void) => void;
}

/**
 * 文章详情页鉴权 + 状态三合一 hook
 * @param postId 文章 ID（用于 requireAuth 的 redirect 路径）
 * @param ssrUser SSR 传入的用户（详情页静态化后可能为 null）
 * @returns { user, post, updatePost, requireAuth }
 */
export function usePostPageAuth(postId: string, ssrUser?: User | null): PostPageAuthContext {
  const user = useCurrentUser(ssrUser);
  const { post, updatePost } = usePostState();
  const requireAuth = useRequireAuth(user, `/posts/${postId}`);

  return { user, post, updatePost, requireAuth };
}
