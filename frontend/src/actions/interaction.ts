/**
 * @file interaction.ts
 * @description 文章互动的 Server Action：点赞 / 收藏的双向切换，需登录。
 *
 * 为什么这两条也要从 HTTP 挪到 Action：列表卡片会渲染 `post.likes`（见 ArticleCard），
 * 详情页头部还会渲染收藏数 —— 走 Route Handler 时 `revalidateTag` 只清服务端 Data Cache，
 * 清不掉浏览器 Router Cache，点完赞回到列表仍是旧数字。Action 内的 revalidatePath 能一并清掉。
 *
 * `/api/posts/[id]/like` 与 `/api/posts/[id]/favorite` 保留为对外数据接口，
 * 两侧共用同一 blogService 与同一 `rate-limit-policy`（见 `POST_LIKE_RATE_LIMIT`）。
 */
'use server';

import { getContainer } from '@my-app/backend/container';
import { NotFoundError } from '@my-app/backend/errors';
import { POST_FAVORITE_RATE_LIMIT, POST_LIKE_RATE_LIMIT } from '@/server/rate-limit-policy';
import { rateLimitFailure, runMutation, type ActionResult } from '@/actions/run';
import type { FavoriteToggleData, LikeData } from '@my-app/shared';

/**
 * 点赞 / 取消点赞同一篇文章（同一动作双向切换）
 * @param id 文章 id
 * @returns 成功返回切换后的 { liked, likes }；未登录 401、文章不存在 404、草稿文章 403、过频 429
 */
export async function likePostAction(id: string): Promise<ActionResult<LikeData>> {
  const limited = await rateLimitFailure(POST_LIKE_RATE_LIMIT);
  if (limited) return limited;

  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError('文章不存在');

    const { blogService } = getContainer();
    const data = await blogService.likePost(postId, user.id);
    // 点赞数同时出现在列表卡片与详情页，按该篇精确失效
    return { data, postId };
  });
}

/**
 * 收藏 / 取消收藏（同一动作双向切换，重复调用来回翻转）
 * @param id 文章 id
 * @returns 成功返回切换后的 { favorited, favorites }；未登录 401、文章不存在 404、草稿文章 403、过频 429
 */
export async function favoritePostAction(id: string): Promise<ActionResult<FavoriteToggleData>> {
  const limited = await rateLimitFailure(POST_FAVORITE_RATE_LIMIT);
  if (limited) return limited;

  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError('文章不存在');

    const { blogService } = getContainer();
    const data = await blogService.toggleFavorite(postId, user.id);
    return { data, postId };
  });
}
