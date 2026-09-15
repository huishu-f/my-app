/**
 * @file route.ts
 * @description 文章详情/更新/删除接口 /api/posts/[id]，提供 GET/PUT/DELETE；GET 匿名视图 CDN 缓存 60s、登录视图禁缓存，PUT/DELETE 需登录且变更后即时失效博客缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess, publicCacheHeaders } from '@/server/utils/api-response';
import { parseUpdatePostBody } from '@/server/modules/blog/blog.validators';

/**
 * 获取文章详情（登录可选）
 * 匿名视图为纯公开内容，允许 CDN 缓存；登录视图含草稿与个性化数据，禁缓存避免跨用户泄漏
 * @param container 数据容器，提供博客服务
 * @param auth 登录用户信息，匿名时为 null
 * @param params 路由动态参数，含文章 id
 * @returns 文章详情（成功响应包裹，匿名视图带缓存头）
 */
export const GET = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    const post = await container.blogService.getPost(id, auth ?? undefined);
    return sendSuccess(
      { post },
      '获取成功',
      200,
      auth ? undefined : { headers: publicCacheHeaders(60) },
    );
  },
  { auth: 'optional' },
);

/**
 * 更新文章（需登录）
 * @param request 路由请求，读取 JSON 请求体
 * @param container 数据容器，提供博客服务
 * @param auth 登录用户信息，作为作者校验依据
 * @param params 路由动态参数，含文章 id
 * @returns 更新后的文章（成功响应包裹）
 */
export const PUT = defineRoute<{ id: string }>(
  async ({ request, container, auth, params }) => {
    const id = requireId(params);
    const body = await request.json();
    const dto = parseUpdatePostBody(body);
    const post = await container.blogService.updatePost(id, dto, auth!.id);
    invalidateBlogCache(id);
    return sendSuccess({ post }, '更新成功');
  },
  { auth: 'required' },
);

/**
 * 删除文章（需登录）
 * @param container 数据容器，提供博客服务
 * @param auth 登录用户信息，作为作者校验依据
 * @param params 路由动态参数，含文章 id
 * @returns 成功响应，数据为 null
 */
export const DELETE = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    await container.blogService.deletePost(id, auth!.id);
    invalidateBlogCache(id);
    return sendSuccess(null, '删除成功');
  },
  { auth: 'required' },
);
