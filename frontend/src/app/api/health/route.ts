/**
 * @file route.ts
 * @description GET /api/health：无需鉴权的探活接口，回显当前生效的 KV 存储适配器以便确认部署环境
 */
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { getKV } from '@/server/infrastructure/kv-mock';

/**
 * 探活
 * @returns 成功返回 { status, timestamp(ISO 字符串), kv.adapterType }；adapterType 为 'upstash'（持久化 Redis）或 'memory'（内存实现，数据不跨实例且重启即丢）。
 *   取适配器显式声明的稳定标识而非 constructor.name，避免生产构建压缩后类名被改写为无意义短串而失去判读价值
 */
export async function GET() {
  try {
    const kv = getKV();
    return sendSuccess(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        kv: { adapterType: kv.adapterName },
      },
      'OK',
    );
  } catch (err) {
    return sendError(err);
  }
}
