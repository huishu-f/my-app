/**
 * @file 收藏列表接口
 * @description 当前用户收藏文章列表端点 /api/favorites，仅提供 GET 一个方法；
 *              需登录鉴权，返回的数据仅当前用户可见，不做缓存
 */
import { type NextRequest } from 'next/server';
import { getContainer } from '@/server/container';
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';

/**
 * 获取当前用户收藏的文章列表
 * @description 需登录；通过 requireAuth 校验登录态后，按当前用户 id 查询其收藏的文章列表
 * @param request 路由请求对象，Cookie 提供登录凭证
 * @returns 成功响应，data 为当前用户收藏的文章列表
 * @throws 鉴权失败（未登录/凭证无效）或查询异常时，由 sendError 统一返回错误响应
 */
export async function GET(request: NextRequest) {
  try {
    const { blogService, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    const posts = await blogService.listFavoritePosts(auth.id);
    return sendSuccess({ posts }, '获取成功');
  } catch (err) {
    return sendError(err);
  }
}
