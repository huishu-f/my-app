/**
 * @file route.ts
 * @description 文章相邻篇（上一篇/下一篇）接口 /api/posts/[id]/neighbors，提供 GET；无需鉴权，纯公开内容，CDN 缓存 60s
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { sendSuccess, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取文章相邻篇（无需鉴权）
 * @param container 数据容器，提供博客服务
 * @param params 路由动态参数，含文章 id
 * @returns 相邻文章数据（成功响应包裹，带公开缓存头）
 */
export const GET = defineRoute<{ id: string }>(
  async ({ container, params }) => {
    const id = requireId(params);
    const neighbors = await container.blogService.getNeighborPosts(id);
    return sendSuccess(neighbors, '获取成功', 200, { headers: publicCacheHeaders(60) });
  },
);
