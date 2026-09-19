/**
 * @file route.ts
 * @description GET /api/favorites：获取当前用户收藏中的文章列表，需登录
 */
import { defineRoute } from '@/server/route-handler';
import { sendSuccess } from '@/server/api-response';

/**
 * 获取我的收藏文章
 * @returns 成功返回 { posts }，无收藏时为空数组且已剔除草稿；未登录 401
 */
export const GET = defineRoute(
  async ({ container, auth }) => {
    const posts = await container.blogService.listFavoritePosts(auth!.id);
    return sendSuccess({ posts }, '获取成功');
  },
  { auth: 'required' },
);
