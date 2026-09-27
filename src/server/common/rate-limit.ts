import "server-only";
import { getPrisma } from "@server/common/db";
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

    if (Math.random() < 0.01) {
      void getPrisma()
        .rateLimit.deleteMany({ where: { expiresAt: { lt: now } } })
        .catch(() => {});
    }

    return count > limit;
  } catch (err) {
    // ponytail: fail open 是刻意的可用性取舍 —— 限流器自身故障不能把登录/注册整体打死。

    logger.error("isRateLimited failed, request allowed", { key, error: String(err) });
    return false;
  }
}

export function getClientIp(request: { headers: Pick<Headers, "get"> }): string {
  const nfIp = request.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // ponytail: XFF 是「自称的客户端, 代理1, …, 边缘代理」——最左段由客户端自由伪造，
  // 只有最右一段是边缘代理实际写入的直连地址，取它做限流键才不可被轮换绕过。
  // 精确归一化需要可信代理白名单，配合各平台的专用头（如 x-nf-*）按部署环境收紧。

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const segments = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return last;
  }

  return "unknown";
}
