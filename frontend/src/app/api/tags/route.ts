/**
 * @file route.ts
 * @description GET /api/tags：统计已发布文章使用过的标签及各自篇数，公开只读无需登录
 */
import { defineRoute } from '@/server/route-handler';
import { sendSuccess, publicCacheHeaders } from '@/server/api-response';

/**
 * 获取标签云数据
 * @returns 成功返回 { tags }，元素为 { name, count } 并按名称排序；草稿文章不计入
 */
export const GET = defineRoute(async ({ container }) => {
  const tags = await container.blogService.getTags();
  // s-maxage 单位秒：标签计数只在文章变动后改变，可让 CDN 缓存 300 秒
  return sendSuccess({ tags }, '获取成功', 200, { headers: publicCacheHeaders(300) });
});
