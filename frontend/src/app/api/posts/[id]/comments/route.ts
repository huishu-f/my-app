/**
 * @file route.ts
 * @description GET/POST /api/posts/[id]/comments：读取指定文章的评论列表与在该文章下发表评论
 */
import { defineRoute, requireId, parseJsonBody } from '@/server/route-handler';
import { invalidateBlogCache } from '@/server/cache';
import { sendSuccess, sendCreated } from '@/server/api-response';
import { COMMENT_CREATE_RATE_LIMIT } from '@/server/rate-limit-policy';
import { parseCreateCommentBody } from '@my-app/backend/modules/comment/comment-validators';

/**
 * 获取指定文章的评论列表，按发布时间倒序
 * @param params.id 文章 ID，缺失时返回 404
 * @returns 成功返回 { comments }，无评论时为空数组；草稿文章对非作者返回 404
 */
export const GET = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const postId = requireId(params);
    const comments = await container.commentService.listComments({
      postId,
      // auth 为 optional：未登录传 undefined，service 据此拒绝非作者查看草稿文章的评论
      user: auth ?? undefined,
    });
    return sendSuccess({ comments }, '获取成功');
  },
  { auth: 'optional' },
);

/**
 * 在指定文章下发表评论（正文会被 sanitize 掉所有 HTML 标签）
 * @param params.id 文章 ID，缺失时返回 404
 * @returns 成功返回 201 与 { comment }；未登录 401，文章不存在 404，草稿文章不可评论 403
 */
export const POST = defineRoute<{ id: string }>(
  async ({ request, container, auth, params }) => {
    const postId = requireId(params);
    const body = await parseJsonBody(request);
    const dto = parseCreateCommentBody(body);
    const comment = await container.commentService.createComment({
      ...dto,
      postId,
      userId: auth!.id,
    });
    invalidateBlogCache();
    return sendCreated({ comment }, '发表评论成功');
  },
  {
    auth: 'required',
    // 与 createCommentAction 共用同一策略与计数键（见 rate-limit-policy.ts）
    rateLimit: COMMENT_CREATE_RATE_LIMIT,
  },
);
