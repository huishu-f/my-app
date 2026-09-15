/**
 * @file route.ts
 * @description 文章列表与创建接口 /api/posts，提供 GET/POST；GET 匿名且非草稿视图 CDN 缓存 60s、登录视图禁缓存，POST 需登录并即时失效 posts/categories/tags 派生缓存
 */
import { type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getContainer } from '@/server/container';
import {
  sendSuccess,
  sendCreated,
  sendError,
  publicCacheHeaders,
} from '@/server/utils/api-response';
import { requireAuth, tryAuth } from '@/server/modules/auth/auth.guard';
import { parseCreatePostBody, parseListQuery } from '@/server/modules/blog/blog.validators';

/**
 * 获取文章列表（可选登录）
 * 匿名且非草稿视图为纯已发布内容，允许 CDN 缓存；登录视角含草稿与个性化数据，禁缓存避免跨用户泄漏
 * @param request 路由请求，读取查询参数与登录凭证
 * @returns 文章列表及分页统计（成功响应包裹，公开视图带缓存头）
 * @throws 查询或鉴权异常时统一由 sendError 返回错误响应
 */
export async function GET(request: NextRequest) {
  try {
    const { blogService, tokenService, userRepo } = getContainer();
    const user = await tryAuth(request, { tokenService, userRepo });
    const params = request.nextUrl.searchParams;
    const query = parseListQuery(Object.fromEntries(params.entries()));
    const result = await blogService.listPosts({ ...query, user: user ?? undefined });
    // 匿名且非草稿视图：纯已发布内容，允许 CDN 缓存 60s；
    // 登录视角（含草稿/个性化数据）禁缓存，避免跨用户泄漏
    const isPublicView = !user && !query.draft;
    return sendSuccess(
      result,
      '获取成功',
      200,
      isPublicView ? { headers: publicCacheHeaders(60) } : undefined,
    );
  } catch (err) {
    return sendError(err);
  }
}

/**
 * 创建文章（需登录）
 * @param request 路由请求，读取 JSON 请求体与登录凭证
 * @returns 新创建的文章（创建成功响应包裹）
 * @throws 鉴权失败或创建异常时统一由 sendError 返回错误响应
 */
export async function POST(request: NextRequest) {
  try {
    const { blogService, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    const body = await request.json();
    const dto = parseCreatePostBody(body);
    const post = await blogService.createPost({ ...dto, authorId: auth.id });
    // 即时失效列表/分类/标签/相邻文章等派生缓存（posts + categories + tags 标签）
    revalidateTag('posts', { expire: 0 });
    revalidateTag('categories', { expire: 0 });
    revalidateTag('tags', { expire: 0 });
    return sendCreated({ post }, '创建成功');
  } catch (err) {
    return sendError(err);
  }
}
