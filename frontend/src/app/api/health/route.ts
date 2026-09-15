/**
 * @file route.ts
 * @description 健康检查接口 /api/health，提供 GET；无需鉴权，返回服务状态、当前时间戳与 KV 适配器类型，供探活使用
 */
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { getKV } from '@/server/infrastructure/kv-mock';

/**
 * 健康检查
 * @returns 状态 ok、当前时间戳与 KV 适配器类型（成功响应包裹）
 * @throws KV 初始化异常时统一由 sendError 返回错误响应
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
