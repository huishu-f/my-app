/**
 * @file route.ts
 * @description 评论编辑/删除接口 /api/comments/[id]，提供 PUT/DELETE；均需登录，以当前登录用户身份操作指定评论，删除后即时失效博客缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess } from '@/server/utils/api-response';
import { parseCreateCommentBody } from '@/server/modules/comment/comment.validators';

/**
 * 编辑评论（需登录）
 * @param request 路由请求，读取 JSON 请求体
 * @param container 数据容器，提供评论服务
 * @param auth 登录用户信息，作为编辑人校验依据
 * @param params 路由动态参数，含评论 id
 * @returns 编辑后的评论数据（成功响应包裹）
 */
export const PUT = defineRoute<{ id: string }>(
  async ({ request, container, auth, params }) => {
    const id = requireId(params, '评论不存在');
    const body = await request.json();
    const dto = parseCreateCommentBody(body);
    const comment = await container.commentService.updateComment(id, dto.content, auth!.id);
    return sendSuccess({ comment }, '编辑成功');
  },
  { auth: 'required' },
);

/**
 * 删除评论（需登录）
 * @param container 数据容器，提供评论服务
 * @param auth 登录用户信息，以此作为删除人校验依据
 * @param params 路由动态参数，含评论 id
 * @returns 成功响应，数据为 null
 */
export const DELETE = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params, '评论不存在');
    const deleted = await container.commentService.deleteComment(id, auth!.id);
    invalidateBlogCache(deleted.postId);
    return sendSuccess(null, '删除成功');
  },
  { auth: 'required' },
);
