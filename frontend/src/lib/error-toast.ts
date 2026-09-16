/**
 * @file API 错误提示
 * @description 统一提取 API 错误信息并通过 toast 展示给用户，
 *              收敛此前散落在多处的 ApiRequestError 处理模式。
 *              需要区分错误状态码给出不同提示的场景（如登录页区分 401/403）
 *              可先自行处理后仍复用本模块。
 */
import toast from '@/lib/toast';
import { ApiRequestError } from '@/lib/api/request';

/**
 * 从错误对象中提取最适合展示给用户的消息
 * @param err 捕获的错误对象
 * @param fallbackMsg 非 ApiRequestError 且 message 为空时的兜底文案
 * @returns 可直接展示的错误文案
 * @description ApiRequestError 优先取 details 字段级校验消息（用中文分号拼接），
 *              其次取 message；其他错误取 message 或兜底文案。
 */
export function resolveApiErrorMessage(err: Error, fallbackMsg = ''): string {
  if (err instanceof ApiRequestError) {
    if (err.details?.length) return err.details.map((d) => d.message).join('；');
    return err.message;
  }
  return err.message || fallbackMsg;
}

/**
 * 统一处理 API 调用失败并弹出错误 toast
 * @param err 捕获的错误对象
 * @param fallbackMsg 非 ApiRequestError 时的兜底提示文案
 */
export function handleApiError(err: Error, fallbackMsg = ''): void {
  toast.error(resolveApiErrorMessage(err, fallbackMsg));
}
