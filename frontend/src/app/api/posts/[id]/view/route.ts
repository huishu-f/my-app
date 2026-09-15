/**
 * @file route.ts
 * @description 浏览量上报接口 /api/posts/[id]/view，提供 POST（客户端 fire-and-forget 调用）；
 *              与 getPost 读路径解耦：文章详情可进入 Data Cache / 静态缓存，
 *              浏览计数由详情页客户端上报触发，不影响缓存命中与页面 TTFB；
 *              仅已发布文章计数（草稿/不存在静默忽略），单 IP 限频防刷
 */
import { defineRoute, requireId } from '@/server/utils/route-handler';
import { sendSuccess } from '@/server/utils/api-response';
import { isRateLimited, getClientIp } from '@/server/utils/rate-limit';

/**
 * 上报文章浏览量（客户端 fire-and-forget 调用，无需鉴权）
 * @param request 路由请求，用于提取客户端 IP 做限频
 * @param container 数据容器，提供博客服务
 * @param params 路由动态参数，含文章 id
 * @returns 成功响应（限频超限时静默忽略，同样返回成功）
 */
export const POST = defineRoute<{ id: string }>(
  async ({ request, container, params }) => {
    const id = requireId(params);

    // 轻量防刷：单 IP 对单文章 5 分钟内最多 30 次上报（超限静默忽略，不报错）
    const ip = getClientIp(request);
    if (isRateLimited(`view:${id}:${ip}`, 30, 5 * 60_000)) {
      return sendSuccess(null, '已记录');
    }

    await container.blogService.incrementView(id);
    return sendSuccess(null, '已记录');
  },
);
