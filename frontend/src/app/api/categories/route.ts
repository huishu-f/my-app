/**
 * @file route.ts
 * @description GET /api/categories：获取已发布文章聚合出的分类名列表，公开只读无需登录
 */
import { defineRoute } from '@/server/utils/route-handler';
import { sendSuccess, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取分类列表
 * @returns 成功返回 { categories }，为分类名字符串数组，无已发布文章时为空数组；存储读取失败 500
 */
export const GET = defineRoute(async ({ container }) => {
  const categories = await container.blogService.getCategories();
  // s-maxage 单位秒：分类仅在文章增删改后变动，可让 CDN 缓存 300 秒
  return sendSuccess({ categories }, '获取成功', 200, { headers: publicCacheHeaders(300) });
});
