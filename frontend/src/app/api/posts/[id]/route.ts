/**
 * @file 文章接口（单条）
 * @description 文章详情/更新/删除端点 /api/posts/[id]，提供 GET、PUT、DELETE 三个方法；
 *              GET 登录可选：匿名视图为纯公开内容，CDN 缓存 60s，登录视图禁缓存避免跨用户泄漏；
 *              PUT/DELETE 需登录：以当前登录用户 id 作为作者校验依据，变更成功后即时失效博客派生缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess, publicCacheHeaders } from '@/server/utils/api-response';
import { parseUpdatePostBody } from '@/server/modules/blog/blog.validators';

/**
 * 获取文章详情
 * @description 登录可选；匿名视图返回纯公开内容并附 60s 公开缓存头，
 *              登录视图可能包含草稿与个性化数据，不缓存避免跨用户泄漏
 * @param container 数据容器，提供 blogService 博客服务
 * @param auth 当前登录用户信息，匿名时为 null
 * @param params 路由动态参数，含文章 id
 * @returns 成功响应，data 为文章详情对象（匿名视图响应带 CDN 缓存头）
 * @throws id 缺失非法或文章不存在时，由 defineRoute 统一返回错误响应
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
 * 更新文章
 * @description 需登录；解析请求体后以当前登录用户 id 作为作者校验依据更新文章，成功后即时失效该文章相关缓存
 * @param request 路由请求对象，用于读取 JSON 请求体（含待更新字段）
 * @param container 数据容器，提供 blogService 博客服务
 * @param auth 当前登录用户信息，其 id 作为作者校验依据（auth: 'required' 保证非空）
 * @param params 路由动态参数，含待更新的文章 id
 * @returns 成功响应，data 为更新后的文章对象
 * @throws id 缺失非法、请求体校验失败或非作者本人操作时，由 defineRoute 统一返回错误响应
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
 * 删除文章
 * @description 需登录；以当前登录用户 id 作为作者校验依据删除文章，成功后即时失效该文章相关缓存
 * @param container 数据容器，提供 blogService 博客服务
 * @param auth 当前登录用户信息，其 id 作为作者校验依据（auth: 'required' 保证非空）
 * @param params 路由动态参数，含待删除的文章 id
 * @returns 成功响应，data 为 null
 * @throws id 缺失非法或非作者本人操作时，由 defineRoute 统一返回错误响应
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
