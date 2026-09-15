/**
 * @file rate-limit.ts
 * @description 内存滑动窗口限频工具：按维度 key 限制窗口内请求数，并提供客户端 IP 提取，供登录/注册等接口防刷复用
 */

import 'server-only';

/**
 * 内存滑动窗口限频器
 * ponytail: 单实例内存方案，多实例部署需替换为 Redis 版（如 @upstash/ratelimit）。
 * ponytail: buckets Map 的 key 随 IP×路由组合无限增长，从不清理空 key。
 *           天花板：~10万 QPS 级别时 Map 内存开始显著（每个 key ~100B）。
 *           升级路径：定期 sweep 空 bucket，或改用 LRU 淘汰。
 * 过期条目在 check 时惰性清理，无需定时器
 */

/**
 * 限频桶：滑动窗口内的时间戳集合
 */
interface Bucket {
  /** 窗口内各次请求的时间戳（ms） */
  timestamps: number[];
}

/** 全局限频桶集合，key 为限频维度标识（如 login:${ip}） */
const buckets = new Map<string, Bucket>();

/**
 * 消费一次请求，惰性清理过期记录
 * @param key 限频维度标识
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口时长（ms）
 * @returns 是否放行及剩余可用请求数
 */
function consume(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key);

  // 清理过期时间戳
  const valid = bucket ? bucket.timestamps.filter((t) => t > cutoff) : [];

  if (valid.length >= limit) {
    buckets.set(key, { timestamps: valid });
    return { allowed: false, remaining: 0 };
  }

  valid.push(now);
  buckets.set(key, { timestamps: valid });
  return { allowed: true, remaining: limit - valid.length };
}

/**
 * 检查限频，超限返回 true（被限流），否则返回 false
 * @param key 限频维度标识（如 `login:${ip}` 或 `register:${ip}`）
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口时长（ms）
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  return !consume(key, limit, windowMs).allowed;
}

/**
 * 从请求头提取客户端 IP
 * @param request 网络请求，优先取 x-forwarded-for 首段，其次取 x-real-ip
 * @returns 客户端 IP 字符串，无法识别时返回 'unknown'
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
