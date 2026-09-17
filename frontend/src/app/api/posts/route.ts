/**
 * @file route.ts
 * @description GET/POST /api/posts：按分类/标签/关键词/草稿筛选分页取文章列表，以及登录用户创建文章
 */
import { defineRoute, parseJsonBody } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess, sendCreated, publicCacheHeaders } from '@/server/utils/api-response';
import { parseCreatePostBody, parseListQuery } from '@/server/modules/blog/blog.validators';

/**
 * 分页获取文章列表，支持分类/标签/关键词/草稿模式筛选
 * @returns 成功返回 { posts, total, page, limit, totalPages }；未登录请求 draft=true 时返回空列表而非报错
 */
export const GET = defineRoute(
  async ({ request, container, auth }) => {
    const params = request.nextUrl.searchParams;
    const query = parseListQuery(Object.fromEntries(params.entries()));
    // 游客可读列表，登录态只影响能否看自己的草稿
    const result = await container.blogService.listPosts({ ...query, user: auth ?? undefined });
    // 仅游客且非草稿模式的列表内容是公共的，才给 CDN 缓存 60 秒（单位：秒）
    const isPublicView = !auth && !query.draft;
    return sendSuccess(
      result,
      '获取成功',
      200,
      isPublicView ? { headers: publicCacheHeaders(60) } : undefined,
    );
  },
  { auth: 'optional' },
);

/**
 * 创建文章，作者取自登录态而非请求体
 * @returns 成功返回 201 与 { post }；未登录 401，参数非法 400，封面图非白名单图床 422
 */
export const POST = defineRoute(
  async ({ request, container, auth }) => {
    const body = await parseJsonBody(request);
    const dto = parseCreatePostBody(body);
    const post = await container.blogService.createPost({ ...dto, authorId: auth!.id });
    // 列表、分类与标签都由文章派生，发文后三者需同时回源重建
    invalidateBlogCache();
    return sendCreated({ post }, '创建成功');
  },
  {
    auth: 'required',
    rateLimit: {
      key: 'posts:create',
      limit: 10,
      windowMs: 5 * 60_000,
      message: '发布过于频繁，请稍后再试',
    },
  },
);
