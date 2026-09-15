/**
 * @file route.ts
 * @description 文章评论列表/发表接口 /api/posts/[id]/comments，提供 GET/POST；GET 登录可选，POST 需登录，发表成功后即时失效博客缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess, sendCreated } from '@/server/utils/api-response';
import { parseCreateCommentBody } from '@/server/modules/comment/comment.validators';

/**
 * 获取文章评论列表（登录可选，登录时包含本人评论状态）
 * @param container 数据容器，提供评论服务
 * @param auth 登录用户信息，匿名时为 null
 * @param params 路由动态参数，含文章 id
 * @returns 评论列表（成功响应包裹）
 */
export const GET = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const postId = requireId(params);
    const comments = await container.commentService.listComments({
      postId,
      user: auth ?? undefined,
    });
    return sendSuccess({ comments }, '获取成功');
  },
  { auth: 'optional' },
);

/**
 * 发表评论（需登录）
 * @param request 路由请求，读取 JSON 请求体
 * @param container 数据容器，提供评论服务
 * @param auth 登录用户信息，作为评论作者
 * @param params 路由动态参数，含文章 id
 * @returns 新发表的评论（创建成功响应包裹）
 */
export const POST = defineRoute<{ id: string }>(
  async ({ request, container, auth, params }) => {
    const postId = requireId(params);
    const body = await request.json();
    const dto = parseCreateCommentBody(body);
    const comment = await container.commentService.createComment({
      ...dto,
      postId,
      userId: auth!.id,
    });
    invalidateBlogCache(postId);
    return sendCreated({ comment }, '发表评论成功');
  },
  { auth: 'required' },
);
