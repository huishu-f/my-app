/**
 * @file route.ts
 * @description 当前用户收藏文章列表接口 /api/favorites，提供 GET；需登录鉴权，返回仅当前用户可见的收藏数据
 */
import { type NextRequest } from 'next/server';
import { getContainer } from '@/server/container';
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';

/**
 * 获取当前用户收藏的文章列表（需登录）
 * @param request 路由请求，读取登录凭证
 * @returns 收藏文章列表（成功响应包裹）
 * @throws 鉴权失败或查询异常时统一由 sendError 返回错误响应
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
