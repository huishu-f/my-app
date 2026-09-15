/**
 * @file route.ts
 * @description 文章标签列表接口 /api/tags，提供 GET；仅聚合已发布文章的标签，纯公开内容，CDN 缓存 300s
 */
import { getContainer } from '@/server/container';
import { sendSuccess, sendError, publicCacheHeaders } from '@/server/utils/api-response';

/**
 * 获取标签列表
 * @returns 标签列表（成功响应包裹，带公开缓存头）
 * @throws 获取标签异常时统一由 sendError 返回错误响应
 */
export async function GET() {
  try {
    const { blogService } = getContainer();
    const tags = await blogService.getTags();
    // 纯公开内容（仅已发布文章聚合），CDN 缓存 300s，与 fetch Data Cache revalidate 对齐
    return sendSuccess({ tags }, '获取成功', 200, { headers: publicCacheHeaders(300) });
  } catch (err) {
    return sendError(err);
  }
}
