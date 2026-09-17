/**
 * @file route.ts
 * @description GET /api/health：无需鉴权的探活接口，回显当前生效的 KV 存储适配器以便确认部署环境
 */
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { getKV } from '@/server/infrastructure/kv-mock';

/**
 * 探活
 * @returns 成功返回 { status, timestamp(ISO 字符串), kv.adapterType }；adapterType 为 MockKV 表示当前走内存存储
 */
export async function GET() {
  try {
    const kv = getKV();
    return sendSuccess(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        kv: { adapterType: kv.constructor.name },
      },
      'OK',
    );
  } catch (err) {
    return sendError(err);
  }
}
