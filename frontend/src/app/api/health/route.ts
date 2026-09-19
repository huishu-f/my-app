/**
 * @file route.ts
 * @description GET /api/health：无需鉴权的探活接口，真探一次 KV 读写并回显当前生效的适配器
 */
import { NextResponse } from 'next/server';
import { sendSuccess } from '@/server/utils/api-response';
import { getKV } from '@/server/infrastructure/kv-mock';

/**
 * 探活
 * @returns KV 可达时 200：{ status: 'ok', timestamp(ISO 字符串), kv: { adapterType, ok: true } }；
 *   KV 不可达时 503：同结构信封 + kv.ok=false 与 kv.error（底层原因）。
 *
 * 这里必须做一次真实读取而不是只回显适配器名：只回显时，线上 Upstash 连不通/令牌失效
 * 本接口仍报 ok，把数据接口的 5xx 掩盖成「服务健康」，排障时看不出问题在数据层。
 * 探针用读而非写——读已经能同时验证连通性与令牌有效性，且不产生副作用。
 * 适配器标识取显式声明的稳定值而非 constructor.name，避免生产构建压缩后类名被改写而失去判读价值。
 */
export async function GET() {
  const kv = getKV();

  let kvOk = true;
  let kvError: string | undefined;
  try {
    await kv.get('health:probe');
  } catch (err) {
    kvOk = false;
    kvError = err instanceof Error ? err.message : String(err);
  }

  const payload = {
    status: kvOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    kv: { adapterType: kv.adapterName, ok: kvOk, ...(kvError ? { error: kvError } : {}) },
  };

  // KV 挂掉时不能回 200：健康检查头撒谎，就等于把数据层故障伪装成服务正常
  if (!kvOk) {
    return NextResponse.json({ code: 503, data: payload, message: 'KV 存储不可用' }, { status: 503 });
  }

  return sendSuccess(payload, 'OK');
}
