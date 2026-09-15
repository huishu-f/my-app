/**
 * @file error-toast.ts
 * @description API 错误统一 toast 提示，消除 4+ 处重复的 ApiRequestError 错误处理模式。
 *              特殊场景（如登录页需区分 401/403 给不同提示）可自行处理后再调用本函数。
 */
import toast from '@/lib/toast';
import { ApiRequestError } from '@/lib/api/request';

/**
 * 统一处理 mutation/API 调用错误并 toast 提示
 * @param err 捕获的错误对象
 * @param fallbackMsg 非 ApiRequestError 时的兜底提示
 */
export function handleApiError(err: Error, fallbackMsg = '操作失败'): void {
  if (err instanceof ApiRequestError) {
    if (err.details?.length) {
      toast.error(err.details.map((d) => d.message).join('；'));
    } else {
      toast.error(err.message);
    }
  } else {
    toast.error(err.message || fallbackMsg);
  }
}
