/**
 * @file comment.ts
 * @description 评论写操作的 Server Action：发表 / 编辑 / 删除评论，并在同一次往返内失效缓存。
 *
 * 三条动作都以「所属文章的 id」为失效目标：评论数展示在列表卡片与详情页，
 * 头像与昵称是冗余字段，所以任何一条评论变更都要让该文章的详情页 Client Cache 一起作废。
 *
 * `/api/posts/[id]/comments` 与 `/api/comments/[id]` 保留为对外数据接口，
 * 发表评论两侧共用 `COMMENT_CREATE_RATE_LIMIT`（同一计数键）。
 */
'use server';

import { getContainer } from '@my-app/backend/container';
import { NotFoundError } from '@my-app/backend/errors';
import { parseCreateCommentBody } from '@my-app/backend/modules/comment/comment-validators';
import { COMMENT_CREATE_RATE_LIMIT } from '@/server/rate-limit-policy';
import { rateLimitFailure, runMutation, type ActionResult } from '@/actions/run';
import type { CommentData, CreateCommentDto } from '@my-app/shared';

/**
 * 在指定文章下发表评论（正文会被 sanitize 掉所有 HTML 标签），作者取自登录态
 * @param postId 文章 id
 * @param input 评论内容，服务端按与 API 同一套 schema 校验
 * @returns 成功返回 { comment }；未登录 401、文章不存在 404、草稿文章不可评论 403、参数非法 400、过频 429
 */
export async function createCommentAction(
  postId: string,
  input: CreateCommentDto,
): Promise<ActionResult<CommentData>> {
  const limited = await rateLimitFailure(COMMENT_CREATE_RATE_LIMIT);
  if (limited) return limited;

  return runMutation(async (user) => {
    const id = postId?.trim();
    if (!id) throw new NotFoundError('文章不存在');

    const dto = parseCreateCommentBody(input);
    const { commentService } = getContainer();
    const comment = await commentService.createComment({ ...dto, postId: id, userId: user.id });
    return { data: { comment }, postId: id };
  });
}

/**
 * 编辑自己发布的评论
 * @param commentId 评论 id
 * @param input 修改后的评论内容，服务端按与 API 同一套 schema 校验
 * @returns 成功返回 { comment }；未登录 401、评论不存在 404、非评论作者 403、内容为空 400
 */
export async function updateCommentAction(
  commentId: string,
  input: CreateCommentDto,
): Promise<ActionResult<CommentData>> {
  return runMutation(async (user) => {
    const id = commentId?.trim();
    if (!id) throw new NotFoundError('评论不存在');

    const dto = parseCreateCommentBody(input);
    const { commentService } = getContainer();
    const comment = await commentService.updateComment(id, dto.content, user.id);
    // 失效目标取自 service 返回的真实归属，而不是调用方传参
    return { data: { comment }, postId: comment.postId };
  });
}

/**
 * 删除评论（评论作者本人或所在文章的作者可删）
 * @param commentId 评论 id
 * @returns 成功返回 data 为 null；未登录 401、评论不存在 404、两者都不是 403
 */
export async function deleteCommentAction(commentId: string): Promise<ActionResult<null>> {
  return runMutation(async (user) => {
    const id = commentId?.trim();
    if (!id) throw new NotFoundError('评论不存在');

    const { commentService } = getContainer();
    const comment = await commentService.deleteComment(id, user.id);
    return { data: null, postId: comment.postId };
  });
}
