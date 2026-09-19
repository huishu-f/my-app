/**
 * @file route.ts
 * @description PUT/DELETE /api/comments/[id]：编辑与删除单条评论，两者均需登录
 */
import { defineRoute, requireId, parseJsonBody } from '@/server/route-handler';
import { invalidateBlogCache } from '@/server/cache';
import { sendSuccess } from '@/server/api-response';
import { parseCreateCommentBody } from '@my-app/backend/modules/comment/comment-validators';

/**
 * 编辑自己发布的评论
 * @param params.id 评论 ID，缺失或为空白时返回 404（评论不存在）
 * @returns 成功返回 { comment }；未登录 401，非评论作者 403，内容为空 400
 */
export const PUT = defineRoute<{ id: string }>(
  async ({ request, container, auth, params }) => {
    const id = requireId(params, '评论不存在');
    const body = await parseJsonBody(request);
    const dto = parseCreateCommentBody(body);
    const comment = await container.commentService.updateComment(id, dto.content, auth!.id);
    return sendSuccess({ comment }, '编辑成功');
  },
  { auth: 'required' },
);

/**
 * 删除评论（评论作者本人或所在文章的作者可删）
 * @param params.id 评论 ID，缺失或为空白时返回 404（评论不存在）
 * @returns 成功返回 data 为 null；未登录 401，两者都不是 403
 */
export const DELETE = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params, '评论不存在');
    await container.commentService.deleteComment(id, auth!.id);
    // 评论数展示在文章列表与详情上，需失效博客列表级缓存
    invalidateBlogCache();
    return sendSuccess(null, '删除成功');
  },
  { auth: 'required' },
);
