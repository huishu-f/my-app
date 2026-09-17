/**
 * @file route.ts
 * @description GET /api/posts/[id]/neighbors：按发布时间取相邻的上下一篇，公开只读无需登录
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { sendSuccess, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取上一篇与下一篇
 * @param params.id 当前文章 ID，缺失时返回 404
 * @returns 成功返回 { prev, next }，位于列表两端或该文章未发布时为 null，不报 404
 */
export const GET = defineRoute<{ id: string }>(async ({ container, params }) => {
  const id = requireId(params);
  const neighbors = await container.blogService.getNeighborPosts(id);
  // s-maxage 单位秒：仅在新文章发布后才会变化，公共缓存 60 秒
  return sendSuccess(neighbors, '获取成功', 200, { headers: publicCacheHeaders(60) });
});
