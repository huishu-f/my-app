/**
 * @file 健康检查接口
 * @description 健康检查端点 /api/health，仅提供 GET 一个方法；
 *              无需鉴权；返回服务状态、当前时间戳与 KV 适配器类型，供部署平台探活与运维诊断使用
 */
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { getKV } from '@/server/infrastructure/kv-mock';

/**
 * 健康检查
 * @description 无需鉴权；初始化并读取 KV 实例，返回服务状态 ok、当前时间戳及 KV 适配器类名，
 *              间接验证 KV 存储可用性
 * @returns 成功响应，data 含 status（'ok'）、timestamp（ISO 时间戳）与 kv.adapterType（KV 适配器类名）
 * @throws KV 初始化异常时，由 sendError 统一返回错误响应
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
