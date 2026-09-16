/**
 * @file 评论接口（单条）
 * @description 评论编辑/删除端点 /api/comments/[id]，提供 PUT 与 DELETE 两个方法；
 *              两个方法均要求登录（auth: 'required'），且以当前登录用户 id 作为操作人做权限校验（仅评论作者本人可操作）；
 *              删除成功后调用 invalidateBlogCache 使该评论所属文章的派生缓存即时失效
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess } from '@/server/utils/api-response';
import { parseCreateCommentBody } from '@/server/modules/comment/comment.validators';

/**
 * 编辑评论
 * @description 需登录；校验评论 id 与请求体后，以当前登录用户 id 作为操作人更新评论内容
 * @param request 路由请求对象，用于读取 JSON 请求体（含评论新内容）
 * @param container 数据容器，提供 commentService 评论服务
 * @param auth 当前登录用户信息，其 id 作为编辑人校验依据（auth: 'required' 保证非空）
 * @param params 路由动态参数，含待编辑的评论 id
 * @returns 编辑成功响应，data 为更新后的评论对象
 * @throws id 缺失非法、请求体校验失败或非本人评论时，由 defineRoute 统一返回错误响应
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
 * 删除评论
 * @description 需登录；以当前登录用户 id 作为操作人删除评论，随后按被删评论的 postId 即时失效博客派生缓存
 * @param container 数据容器，提供 commentService 评论服务
 * @param auth 当前登录用户信息，其 id 作为删除人校验依据（auth: 'required' 保证非空）
 * @param params 路由动态参数，含待删除的评论 id
 * @returns 删除成功响应，data 为 null
 * @throws id 缺失非法或非本人评论时，由 defineRoute 统一返回错误响应
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
