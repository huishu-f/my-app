/**
 * @file route.ts
 * @description GET/PUT /api/config：读取站点配置（公开）与更新站点配置（仅 Admin）
 */
import { defineRoute, parseJsonBody } from '@/server/route-handler';
import { invalidateConfigCache } from '@/server/cache';
import { sendSuccess, publicCacheHeaders } from '@/server/api-response';
import { parseUpdateSiteConfigBody } from '@my-app/backend/modules/blog/blog-validators';

/**
 * 获取站点配置（博客名、作者名）
 * @returns 成功返回 { config }；存储读取失败 500
 */
export const GET = defineRoute(async ({ container }) => {
  const config = await container.blogService.getConfig();
  // s-maxage 单位秒：站点配置极少变更，可让 CDN 缓存 600 秒
  return sendSuccess({ config }, '获取成功', 200, { headers: publicCacheHeaders(600) });
});

/**
 * 更新站点配置，service 层校验调用者角色为 Admin
 * @returns 成功返回更新后的 { config }；未登录 401，非管理员 403，参数非法 400
 */
export const PUT = defineRoute(
  async ({ request, container, auth }) => {
    const body = await parseJsonBody(request);
    const dto = parseUpdateSiteConfigBody(body);
    const config = await container.blogService.updateConfig(dto, auth!.id);
    invalidateConfigCache();
    return sendSuccess({ config }, '更新成功');
  },
  { auth: 'required' },
);
