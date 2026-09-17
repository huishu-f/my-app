/**
 * @file route.ts
 * @description POST /api/posts/[id]/like：切换当前用户对文章的点赞状态，需登录
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess } from '@/server/utils/api-response';

/**
 * 点赞/取消点赞同一篇文章（同一接口双向切换）
 * @param params.id 文章 ID，缺失时返回 404
 * @returns 成功返回 { liked, likes }；未登录 401，文章不存在 404，草稿文章 403
 */
export const POST = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    const result = await container.blogService.likePost(id, auth!.id);
    invalidateBlogCache(id);
    return sendSuccess(result, '操作成功');
  },
  {
    auth: 'required',
    rateLimit: { key: 'posts:like', limit: 30, windowMs: 60_000 },
  },
);
