/**
 * @file 文章相邻篇接口
 * @description 文章相邻篇（上一篇/下一篇）查询端点 /api/posts/[id]/neighbors，仅提供 GET 一个方法；
 *              无需鉴权，返回纯公开内容，CDN 缓存 60s
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { sendSuccess, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取文章相邻篇
 * @description 无需鉴权；按文章 id 查询时间上相邻的上一篇与下一篇（仅已发布文章），
 *              返回纯公开内容并附 60s 公开缓存头
 * @param container 数据容器，提供 blogService 博客服务
 * @param params 路由动态参数，含当前文章 id
 * @returns 成功响应，data 为相邻文章数据（上一篇/下一篇），响应带 CDN 缓存头
 * @throws 文章 id 缺失非法时，由 defineRoute 统一返回错误响应
 */
export const GET = defineRoute<{ id: string }>(
  async ({ container, params }) => {
    const id = requireId(params);
    const neighbors = await container.blogService.getNeighborPosts(id);
    return sendSuccess(neighbors, '获取成功', 200, { headers: publicCacheHeaders(60) });
  },
);
