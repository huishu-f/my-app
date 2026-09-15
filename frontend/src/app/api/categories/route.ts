/**
 * @file route.ts
 * @description 文章分类列表接口 /api/categories，提供 GET；仅聚合已发布文章的分类，纯公开内容，CDN 缓存 300s
 */
import { getContainer } from '@/server/container';
import { sendSuccess, sendError, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取文章分类列表
 * @returns 分类列表（成功响应包裹，带公开缓存头）
 * @throws 获取分类异常时统一由 sendError 返回错误响应
 */
export async function GET() {
  try {
    const { blogService } = getContainer();
    const categories = await blogService.getCategories();
    // 纯公开内容（仅已发布文章聚合），CDN 缓存 300s，与 fetch Data Cache revalidate 对齐
    return sendSuccess({ categories }, '获取成功', 200, { headers: publicCacheHeaders(300) });
  } catch (err) {
    return sendError(err);
  }
}
