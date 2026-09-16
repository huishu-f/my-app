/**
 * @file error-toast.ts
 * @description API 错误统一 toast 提示，消除 4+ 处重复的 ApiRequestError 错误处理模式。
 *              特殊场景（如登录页需区分 401/403 给不同提示）可自行处理后再调用本函数。
 */
import toast from '@/lib/toast';
import { ApiRequestError } from '@/lib/api/request';

/**
 * 从 API 错误中提取最准确的用户可见消息
 * @param err 捕获的错误对象
 * @param fallbackMsg 非 ApiRequestError 时的兜底提示
 * @returns 适合显示给用户的错误文案
 */
export function resolveApiErrorMessage(err: Error, fallbackMsg = ''): string {
  if (err instanceof ApiRequestError) {
    if (err.details?.length) return err.details.map((d) => d.message).join('；');
    return err.message;
  }
  return err.message || fallbackMsg;
}

/**
 * 统一处理 mutation/API 调用错误并 toast 提示
 * @param err 捕获的错误对象
 * @param fallbackMsg 非 ApiRequestError 时的兜底提示
 */
export function handleApiError(err: Error, fallbackMsg = ''): void {
  toast.error(resolveApiErrorMessage(err, fallbackMsg));
}
