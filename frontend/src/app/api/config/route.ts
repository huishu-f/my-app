/**
 * @file 站点配置接口
 * @description 站点配置读取与更新端点 /api/config，提供 GET 与 PUT 两个方法；
 *              GET 为纯公开配置，CDN 缓存 600s（与 fetch Data Cache revalidate 对齐）；
 *              PUT 需登录，更新成功后即时失效 config 标签缓存
 */
import { type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getContainer } from '@/server/container';
import { sendSuccess, sendError, publicCacheHeaders } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';
import { parseUpdateSiteConfigBody } from '@/server/modules/blog/blog.validators';

/**
 * 获取站点配置
 * @description 无需鉴权；返回站点公开配置，属纯公开内容，响应附 600s 公开缓存头
 * @returns 成功响应，data 为站点配置对象，响应带 CDN 缓存头
 * @throws 获取配置异常时，由 sendError 统一返回错误响应
 */
export async function GET() {
  try {
    const { blogService } = getContainer();
    const config = await blogService.getConfig();
    // 纯公开配置，CDN 缓存 600s，与 fetch Data Cache revalidate 对齐
    return sendSuccess({ config }, '获取成功', 200, { headers: publicCacheHeaders(600) });
  } catch (err) {
    return sendError(err);
  }
}

/**
 * 更新站点配置
 * @description 需登录；解析请求体后更新站点配置，成功后即时失效 config 标签缓存，保证下次请求读到新配置
 * @param request 路由请求对象，JSON 请求体提供配置字段，Cookie 提供登录凭证
 * @returns 成功响应，data 为更新后的站点配置对象
 * @throws 鉴权失败（未登录）、请求体校验失败或更新异常时，由 sendError 统一返回错误响应
 */
export async function PUT(request: NextRequest) {
  try {
    const { blogService, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    const body = await request.json();
    const dto = parseUpdateSiteConfigBody(body);
    const config = await blogService.updateConfig(dto, auth.id);
    // 即时失效站点配置缓存（config 标签）
    revalidateTag('config', { expire: 0 });
    return sendSuccess({ config }, '更新成功');
  } catch (err) {
    return sendError(err);
  }
}
