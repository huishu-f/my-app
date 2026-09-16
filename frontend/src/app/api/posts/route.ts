/**
 * @file 文章接口（列表）
 * @description 文章列表与创建端点 /api/posts，提供 GET 与 POST 两个方法；
 *              GET 登录可选：匿名且非草稿视图为纯已发布内容，允许 CDN 缓存 60s，登录视图（含草稿/个性化数据）禁缓存避免跨用户泄漏；
 *              POST 需登录：创建文章后即时失效 posts/categories/tags 三类标签缓存
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
 * 获取文章列表
 * @description 登录可选；解析查询参数后按用户视角（匿名/登录）列出文章，
 *              匿名且非草稿视图为纯已发布内容，附加 60s 公开缓存头；登录视图含草稿与个性化数据，不缓存
 * @param request 路由请求对象，查询字符串提供分页/筛选条件，Cookie 提供登录凭证
 * @returns 成功响应，data 为文章列表及分页统计（公开视图响应带 CDN 缓存头）
 * @throws 查询参数校验失败或鉴权异常时，由 sendError 统一返回错误响应
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
 * 创建文章
 * @description 需登录；解析请求体后以当前登录用户为作者创建文章，
 *              创建成功即时失效 posts/categories/tags 标签缓存，保证列表与聚合数据立即更新
 * @param request 路由请求对象，JSON 请求体提供文章字段，Cookie 提供登录凭证
 * @returns 创建成功响应（201），data 为新创建的文章对象
 * @throws 鉴权失败（未登录）、请求体校验失败或创建异常时，由 sendError 统一返回错误响应
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
