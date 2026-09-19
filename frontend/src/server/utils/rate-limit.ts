/**
 * @file rate-limit.ts
 * @description 固定窗口限流：计数走 KV 原子 INCR+EXPIRE——Netlify 多实例下共享同一计数（进程内 Map 会被实例数倍增，防爆破失效）；含客户端 IP 提取（取平台可信头，防伪造）
 */
import 'server-only';
import { getKV } from '@server/infrastructure/kv-mock';

/** 限流键统一前缀，与业务数据键空间隔离 */
const RATE_LIMIT_PREFIX = 'ratelimit';

/**
 * 消费一次限流配额：KV 原子计数 +1，窗口内计数达到上限即拒绝
 * @param key 限流维度键，通常由调用方组合为 动作:客户端IP
 * @param limit 窗口内允许的最大请求数
 * @param windowMs 窗口长度，单位 ms
 * @returns true 表示已超限应拒绝，false 表示放行
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const count = await getKV().rateLimitIncr(
      `${RATE_LIMIT_PREFIX}:${key}`,
      Math.ceil(windowMs / 1000),
    );
    return count > limit;
  } catch {
    // 限流器故障不应拖垮业务请求（fail-open）；被限流保护的接口另有鉴权与校验兜底
    return false;
  }
}

/**
 * 从请求头解析客户端真实 IP（防伪造）
 *
 * 信任顺序：
 * 1. `x-nf-client-connection-ip`：Netlify 平台注入的真实客户端 IP，不可被请求方伪造（部署在 Netlify 上时最可信）
 * 2. `x-forwarded-for` 的**最后一个**值：XFF 链是「客户端伪造部分 + 各代理逐跳 append」，
 *    最右侧的值由离本服务最近的受信代理写入，取左值（现行做法）可被客户端随意伪造刷爆/绕过限流
 * 3. `x-real-ip`：单层反代的常用约定
 * @param request 请求对象；只用到 headers，故放宽为最小结构，使 Server Action 可传 `{ headers: await headers() }` 复用
 * @returns 解析出的 IP；均缺失时返回 'unknown'
 */
export function getClientIp(request: { headers: Pick<Headers, 'get'> }): string {
  const nfIp = request.headers.get('x-nf-client-connection-ip');
  if (nfIp) return nfIp;

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return request.headers.get('x-real-ip') || 'unknown';
}
