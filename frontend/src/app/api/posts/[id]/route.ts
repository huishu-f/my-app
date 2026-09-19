/**
 * @file route.ts
 * @description GET/PUT/DELETE /api/posts/[id]：读取单篇文章详情，以及作者更新、删除自己的文章
 */
import { defineRoute, requireId, parseJsonBody } from '@/server/route-handler';
import { invalidateBlogCache } from '@/server/cache';
import { sendSuccess, publicCacheHeaders } from '@/server/api-response';
import { parseUpdatePostBody } from '@my-app/backend/modules/blog/blog-validators';

/**
 * 读取文章详情，正文返回前已由 Markdown 渲染
 * @param params.id 文章 ID，缺失时返回 404
 * @returns 成功返回 { post }；草稿仅作者本人可见，他人访问按 404 处理；游客请求额外给 60 秒公共缓存
 */
export const GET = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    const post = await container.blogService.getPost(id, auth ?? undefined);
    // 带登录态的响应可能含草稿等个性化内容，不能写入 CDN 缓存；s-maxage 单位秒
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
 * 更新文章内容或发布状态（仅文章作者）
 * @param params.id 文章 ID；请求体为待更新字段，经 parseUpdatePostBody 校验
 * @returns 成功返回更新后的 { post }；未登录 401，文章不存在 404，非作者 403，参数非法 400
 */
export const PUT = defineRoute<{ id: string }>(
  async ({ request, container, auth, params }) => {
    const id = requireId(params);
    const body = await parseJsonBody(request);
    const dto = parseUpdatePostBody(body);
    const post = await container.blogService.updatePost(id, dto, auth!.id);
    invalidateBlogCache();
    return sendSuccess({ post }, '更新成功');
  },
  { auth: 'required' },
);

/**
 * 删除文章（仅作者），service 层会级联清理该文章的评论与用户的点赞/收藏记录
 * @param params.id 文章 ID，缺失时返回 404
 * @returns 成功返回 data 为 null；未登录 401，文章不存在 404，非作者 403
 */
export const DELETE = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    await container.blogService.deletePost(id, auth!.id);
    invalidateBlogCache();
    return sendSuccess(null, '删除成功');
  },
  { auth: 'required' },
);
