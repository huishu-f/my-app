/**
 * @file 文章评论接口
 * @description 文章评论列表与发表端点 /api/posts/[id]/comments，提供 GET 与 POST 两个方法；
 *              GET 登录可选，登录时列表包含本人评论的个性化状态；
 *              POST 需登录，以当前登录用户为评论作者，发表成功后即时失效该文章的博客派生缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess, sendCreated } from '@/server/utils/api-response';
import { parseCreateCommentBody } from '@/server/modules/comment/comment.validators';

/**
 * 获取文章评论列表
 * @description 登录可选；按文章 id 查询评论列表，登录用户视角包含本人评论状态，匿名时为纯公开数据
 * @param container 数据容器，提供 commentService 评论服务
 * @param auth 当前登录用户信息，匿名时为 null
 * @param params 路由动态参数，含文章 id
 * @returns 成功响应，data 为该文章的评论列表
 * @throws 文章 id 缺失非法时，由 defineRoute 统一返回错误响应
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
 * 发表评论
 * @description 需登录；解析请求体后以当前登录用户为评论作者在该文章下发表评论，成功后即时失效博客派生缓存
 * @param request 路由请求对象，用于读取 JSON 请求体（含评论内容）
 * @param container 数据容器，提供 commentService 评论服务
 * @param auth 当前登录用户信息，其 id 作为评论作者（auth: 'required' 保证非空）
 * @param params 路由动态参数，含待评论的文章 id
 * @returns 创建成功响应（201），data 为新发表的评论对象
 * @throws 文章 id 缺失非法或请求体校验失败时，由 defineRoute 统一返回错误响应
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
