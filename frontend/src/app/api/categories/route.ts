/**
 * @file 分类列表接口
 * @description 文章分类列表端点 /api/categories，仅提供 GET 一个方法；
 *              无需鉴权；仅聚合已发布文章的分类，纯公开内容，CDN 缓存 300s（与 fetch Data Cache revalidate 对齐）
 */
import { getContainer } from '@/server/container';
import { sendSuccess, sendError, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取文章分类列表
 * @description 无需鉴权；调用 blogService 聚合已发布文章的分类，
 *              返回纯公开内容并附 300s 公开缓存头
 * @returns 成功响应，data 为分类列表，响应带 CDN 缓存头
 * @throws 获取分类异常时，由 sendError 统一返回错误响应
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
