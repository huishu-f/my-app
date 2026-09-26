import "server-only";
import { getPrisma } from "@/lib/prisma/db";
import { logger } from "@server/common/logger";

export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const id = `ratelimit:${key}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  try {
    // ponytail: 单条原子 upsert。之前是「SELECT ... FOR UPDATE 再 create」，
    // 行不存在时 FOR UPDATE 不产生任何锁，一个键的首批并发请求会全部读到空、
    // 全部走 create，只有一个成功，其余抛唯一键冲突 P2002 并被外层 catch 静默放行。
    const rows = await getPrisma().$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" (id, count, "expiresAt")
      VALUES (${id}, 1, ${expiresAt})
      ON CONFLICT (id) DO UPDATE SET
        count = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "RateLimit"."expiresAt" END
      RETURNING count
    `;
    const count = rows[0]?.count ?? 1;

    // ponytail: 懒清理改为不阻塞请求路径 —— 之前是 await 一条 deleteMany，
    // 把随机延迟加到了用户可感知的操作上。
    if (Math.random() < 0.01) {
      void getPrisma()
        .rateLimit.deleteMany({ where: { expiresAt: { lt: now } } })
        .catch(() => {});
    }

    return count > limit;
  } catch (err) {
    // ponytail: fail open 是刻意的可用性取舍 —— 限流器自身故障不能把登录/注册整体打死。
    // 代价是 DB 抖动期间限流整体失效（不再精确），因此这条日志必须可被告警消费。
    logger.error("isRateLimited failed, request allowed", { key, error: String(err) });
    return false;
  }
}

export function getClientIp(request: { headers: Pick<Headers, "get"> }): string {
  const nfIp = request.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // ponytail: XFF 的顺序是「客户端, 代理1, 代理2…」，最左段才是客户端地址。
  // 取最后一段拿到的是离服务器最近的那一跳（Netlify 边缘 IP），会把全部用户
  // 归并到同一个 key 上 —— 一次全局误锁。这里取最左段；伪造 XFF 只能绕过限流，
  // 不会误伤他人，两者相权取前者。
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
