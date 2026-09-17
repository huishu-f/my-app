/**
 * @file route.ts
 * @description POST /api/posts/[id]/favorite：切换当前用户对该文章的收藏状态，需登录
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess } from '@/server/utils/api-response';

/**
 * 收藏 / 取消收藏（同一接口双向切换，重复调用来回翻转）
 * @param params.id 文章 ID，缺失时返回 404
 * @returns 成功返回 { favorited, favorites }；未登录 401，文章不存在 404，草稿文章 403
 */
export const POST = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    const result = await container.blogService.toggleFavorite(id, auth!.id);
    invalidateBlogCache(id);
    return sendSuccess(result, '操作成功');
  },
  {
    auth: 'required',
    rateLimit: { key: 'posts:favorite', limit: 30, windowMs: 60_000 },
  },
);
