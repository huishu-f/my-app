/**
 * @file error-toast.ts
 * @description API 错误文案解析与 toast 提示工具：把 ApiRequestError 转成可读消息并统一弹出
 */

import toast from '@/lib/toast';
import { ApiRequestError } from '@/lib/api/request';

/**
 * 从错误对象解析出可展示给用户的一条文案
 * @param err 捕获到的错误
 * @param fallbackMsg 无信息时的兜底文案，默认空串
 * @returns ApiRequestError 若带字段校验详情，用"；"拼接各字段 message；否则用其 message；普通错误用 message 或 fallbackMsg
 */
export function resolveApiErrorMessage(err: Error, fallbackMsg = ''): string {
  if (err instanceof ApiRequestError) {
    if (err.details?.length) return err.details.map((d) => d.message).join('；');
    return err.message;
  }
  return err.message || fallbackMsg;
}

/**
 * 统一处理 API 错误：解析文案后以 error toast 弹出
 * @param err 捕获到的错误
 * @param fallbackMsg 无信息时的兜底文案，默认空串
 */
export function handleApiError(err: Error, fallbackMsg = ''): void {
  toast.error(resolveApiErrorMessage(err, fallbackMsg));
}
