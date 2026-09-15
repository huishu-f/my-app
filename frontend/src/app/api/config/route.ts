/**
 * @file route.ts
 * @description 站点配置接口 /api/config，提供 GET/PUT；GET 为纯公开配置，CDN 缓存 600s；PUT 需登录，更新后即时失效 config 标签缓存
 */
import { type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getContainer } from '@/server/container';
import { sendSuccess, sendError, publicCacheHeaders } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';
import { parseUpdateSiteConfigBody } from '@/server/modules/blog/blog.validators';

/**
 * 获取站点配置（公开，可缓存）
 * @returns 站点配置数据（成功响应包裹，带公开缓存头）
 * @throws 获取配置异常时统一由 sendError 返回错误响应
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
 * 更新站点配置（需登录）
 * @param request 路由请求，读取 JSON 请求体与登录凭证
 * @returns 更新后的站点配置数据（成功响应包裹）
 * @throws 鉴权失败或更新异常时统一由 sendError 返回错误响应
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
