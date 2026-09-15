/**
 * @file use-async-action.ts
 * @description 通用异步提交 hook — 封装 mutate / isPending 与成功/失败/结束回调分发。
 *              默认不重试（非幂等写操作安全）。传入 retry: true 时启用指数退避重试
 *              （网络错误 / 408 / 429，最多 3 次）——仅用于幂等操作（如 GET 类查询）。
 *              调用约定：mutate(vars, { onSuccess, onError, onSettled })。
 *
 *              ⚠️ 设计要点：defaults 通过 useRef 持有，不作为 useCallback 依赖项。
 *              调用方传入的内联对象 `{ onSuccess: () => ..., onError: () => ... }`
 *              每次渲染产生新引用，若放入依赖数组会导致 mutate 每次渲染重建，
 *              使 useCallback 形同虚设。改用 ref 后 mutate 仅依赖 action（通常稳定）。
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** mutate 的回调集合 */
export interface MutationCallbacks<TData> {
  /** 成功回调（接收接口响应数据） */
  onSuccess?: (data: TData) => void;
  /** 失败回调（接收错误对象，不向调用方抛出） */
  onError?: (err: Error) => void;
  /** 结束回调（无论成功失败都执行，如关闭确认弹窗） */
  onSettled?: () => void;
}

/** 重试延迟基数（ms）：1s → 2s → 4s */
const RETRY_BASE_DELAY = 1_000;
/** 最大重试次数（网络错误或 408/429 超过此次数后放弃） */
const MAX_RETRIES = 3;

/**
 * 判断错误是否可重试（网络错误 / 408 / 429），优先检查 ApiRequestError 的 HTTP 状态码，回退到消息体匹配
 * @param err 错误对象
 */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return false;
  // 检查 ApiRequestError 的 status 属性（鸭子类型，避免 import 循环依赖）
  const status = (err as { status?: number }).status;
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status === 0;
  }
  // 回退：消息体匹配（兼容非 ApiRequestError 的网络错误）
  const msg = err.message.toLowerCase();
  return msg.includes('timeout') || msg.includes('network') ||
    msg.includes('failed to fetch') || msg.includes('408') || msg.includes('429');
}

/** useAsyncAction 返回的提交器 */
export interface AsyncAction<TVars, TData> {
  /** 触发提交。串行保护：pending 期间调用直接忽略，防止重复提交 */
  mutate: (vars: TVars, callbacks?: MutationCallbacks<TData>) => Promise<TData | undefined>;
  /** 是否提交中（用于按钮 loading / disabled） */
  isPending: boolean;
}

/**
 * 通用异步提交 hook
 * @param action 提交函数（接收参数，返回接口响应）
 * @param defaults 默认回调（业务 hook 内置的错误提示等），与 per-call 回调叠加执行
 * @param retry 启用重试（仅用于幂等操作）。默认 false——非幂等写操作不重试，避免重复提交
 * @returns {@link AsyncAction} mutate / isPending
 *
 * @example
 * // 幂等操作（可安全重试）
 * export function useFetchPost() {
 *   const action = useCallback((id: string) => blogApi.getPost(id), []);
 *   return useAsyncAction(action, { retry: true });
 * }
 */
export function useAsyncAction<TVars, TData>(
  action: (vars: TVars) => Promise<TData>,
  defaults?: MutationCallbacks<TData>,
  retry = false,
): AsyncAction<TVars, TData> {
  const [isPending, setIsPending] = useState(false);
  /** 串行保护：pending 期间忽略后续调用 */
  const mutatingRef = useRef(false);

  /**
   * 用 ref 持有最新 defaults，避免将其作为 useCallback 依赖。
   * 调用方传入的内联 `{ onSuccess, onError }` 每次渲染产生新引用，
   * 若放入依赖数组会导致 mutate 每次渲染重建——useCallback 形同虚设。
   * ref 方案使 mutate 仅依赖 action（通常由 useCallback 稳定化），实现真正的 memoization。
   */
  const defaultsRef = useRef(defaults);
  useEffect(() => {
    defaultsRef.current = defaults;
  });

  const mutate = useCallback(
    async (vars: TVars, callbacks?: MutationCallbacks<TData>) => {
      if (mutatingRef.current) return undefined;
      mutatingRef.current = true;
      setIsPending(true);

      try {
        let attempt = 0;
        while (true) {
          try {
            const data = await action(vars);
            defaultsRef.current?.onSuccess?.(data);
            callbacks?.onSuccess?.(data);
            return data;
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));

            // 不可重试错误、未启用重试、或已达最大重试次数 → 直接失败
            if (!retry || !isRetryableError(error) || attempt >= MAX_RETRIES) {
              defaultsRef.current?.onError?.(error);
              callbacks?.onError?.(error);
              return undefined;
            }

            // 指数退避：1s → 2s → 4s
            const delay = RETRY_BASE_DELAY * 2 ** attempt;
            await new Promise<void>((resolve) => setTimeout(resolve, delay));
            attempt++;
          }
        }
      } finally {
        mutatingRef.current = false;
        setIsPending(false);
        defaultsRef.current?.onSettled?.();
        callbacks?.onSettled?.();
      }
    },
    [action], // ← 仅依赖 action，defaults 通过 ref 访问
  );

  return { mutate, isPending };
}
