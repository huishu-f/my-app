/**
 * @file route.ts
 * @description 文章点赞接口 /api/posts/[id]/like，提供 POST；需登录，点赞成功后即时失效博客缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess } from '@/server/utils/api-response';

/**
 * 文章点赞（需登录）
 * @param container 数据容器，提供博客服务
 * @param auth 登录用户信息，作为点赞操作者
 * @param params 路由动态参数，含文章 id
 * @returns 点赞后的状态数据（成功响应包裹）
 */
export const POST = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    const result = await container.blogService.likePost(id, auth!.id);
    invalidateBlogCache(id);
    return sendSuccess(result, '操作成功');
  },
  { auth: 'required' },
);
