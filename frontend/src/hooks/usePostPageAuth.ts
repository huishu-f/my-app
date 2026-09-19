/**
 * @file usePostPageAuth.ts
 * @description 文章详情页鉴权聚合 Hook：组合当前用户、文章状态与登录守卫，产出页面共享的鉴权上下文
 */
'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePostState, type PostStateValue } from '@/features/posts/components/PostStateProvider';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { User } from '@my-app/shared';

/**
 * 文章详情页鉴权上下文：继承 PostStateProvider 的文章状态，附加当前用户与登录守卫
 */
export interface PostPageAuthContext extends PostStateValue {
  /** 当前登录用户，未登录为 null */
  user: User | null;

  /** 需登录才能执行的动作包装器：未登录时提示并跳登录，已登录时执行传入 action */
  requireAuth: (action: () => void) => void;
}

/**
 * 聚合文章详情页所需的用户、文章状态与登录守卫，供页面子组件共享
 * @param postId 当前文章 ID，用于拼接登录后回跳的 redirect 路径
 * @param ssrUser 服务端注入的用户兜底数据
 * @returns
 * - `user`       当前登录用户，未登录为 null
 * - `post`       继承自 PostStateProvider 的当前文章状态
 * - `updatePost` 更新文章的函数
 * - `requireAuth` 需登录才能执行的动作守卫
 */
export function usePostPageAuth(postId: string, ssrUser?: User | null): PostPageAuthContext {
  const user = useCurrentUser(ssrUser);
  const { post, updatePost } = usePostState();
  const requireAuth = useRequireAuth(user, `/posts/${postId}`);

  return { user, post, updatePost, requireAuth };
}
