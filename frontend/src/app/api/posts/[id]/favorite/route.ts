/**
 * @file 文章收藏接口
 * @description 文章收藏切换端点 /api/posts/[id]/favorite，仅提供 POST 一个方法；
 *              需登录（auth: 'required'），以当前登录用户身份切换（收藏/取消收藏）文章，
 *              切换成功后即时失效该文章的博客派生缓存
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { invalidateBlogCache } from '@/server/utils/cache';
import { sendSuccess } from '@/server/utils/api-response';

/**
 * 切换文章收藏状态
 * @description 需登录；以当前登录用户 id 切换对目标文章的收藏状态（已收藏则取消，未收藏则添加），并即时失效该文章缓存
 * @param container 数据容器，提供 blogService 博客服务
 * @param auth 当前登录用户信息，其 id 作为收藏操作者（auth: 'required' 保证非空）
 * @param params 路由动态参数，含目标文章 id
 * @returns 成功响应，data 为切换后的收藏状态数据（如是否已收藏、收藏计数等）
 * @throws 文章 id 缺失非法时，由 defineRoute 统一返回错误响应
 */
export const POST = defineRoute<{ id: string }>(
  async ({ container, auth, params }) => {
    const id = requireId(params);
    const result = await container.blogService.toggleFavorite(id, auth!.id);
    invalidateBlogCache(id);
    return sendSuccess(result, '操作成功');
  },
  { auth: 'required' },
);
