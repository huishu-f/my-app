/**
 * @file route.ts
 * @description POST /api/posts/[id]/view：为文章累加一次浏览量，匿名调用且按文章 + IP 限流
 */
import { defineRoute, requireId } from '@/server/route-handler';
import { sendSuccess } from '@/server/api-response';
import { isRateLimited, getClientIp } from '@my-app/backend/utils/rate-limit';

/**
 * 累加一次文章浏览量
 * @param request 不读请求体，仅取客户端 IP 参与限流计数
 * @returns 恒返回 200 与 '已记录'：命中限流或文章为草稿时静默不计数，不返回错误
 */
export const POST = defineRoute<{ id: string }>(async ({ request, container, params }) => {
  const id = requireId(params);

  const ip = getClientIp(request);
  // 同一 IP 对同一篇文章在 5 * 60_000 ms（5 分钟）窗口内最多计 30 次浏览
  if (await isRateLimited(`view:${id}:${ip}`, 30, 5 * 60_000)) {
    // 浏览量属于旁路统计，超限时也回成功，避免前端因埋点失败提示报错
    return sendSuccess(null, '已记录');
  }

  await container.blogService.incrementView(id);
  return sendSuccess(null, '已记录');
});
