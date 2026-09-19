/**
 * @file useAsyncAction.ts
 * @description 客户端异步动作 Hook：包装提交类请求，提供 pending 状态、一次性防重入与可选指数退避重试；适合表单提交、点赞等 mutation
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 异步动作的回调钩子集合，可在 hook 初始化时作为默认值提供，也可在单次 mutate 调用时覆盖
 * @template TData 动作成功返回的数据类型
 */
export interface MutationCallbacks<TData> {
  /** 成功后触发，携带返回数据 */
  onSuccess?: (data: TData) => void;

  /** 失败后触发，携带错误对象 */
  onError?: (err: Error) => void;

  /** 无论成功失败都触发，用于收尾（如关闭 loading） */
  onSettled?: () => void;
}

/** 指数退避重试的基础延时，单位 ms；第 n 次重试等待 RETRY_BASE_DELAY * 2^n */
const RETRY_BASE_DELAY = 1_000;

/** 可重试错误的最大重试次数 */
const MAX_RETRIES = 3;

/**
 * 判断错误是否属于可重试范围
 * @param err 抛出的错误
 * @returns AbortError 与网络/超时/限流类错误返回 true；其余（如 4xx 业务错误）返回 false
 */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return false;

  // 携带 HTTP status 时：408 请求超时、429 触发限流、0 网络层失败可重试
  const status = (err as { status?: number }).status;
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status === 0;
  }

  const msg = err.message.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('408') ||
    msg.includes('429')
  );
}

/**
 * useAsyncAction 返回的动作对象
 * @template TVars 动作入参类型
 * @template TData 动作成功返回的数据类型
 */
export interface AsyncAction<TVars, TData> {
  /**
   * 执行动作。同一时刻仅允许一次进行中的调用（重入直接返回 undefined）；
   * retry 开启时对可重试错误按指数退避最多重试 MAX_RETRIES 次；依次触发 defaults 与本次 callbacks
   * @param vars 动作入参
   * @param callbacks 本次调用的回调，优先级高于 hook 默认回调
   * @returns 成功返回数据；失败或被重入拦截返回 undefined，不向外抛异常
   */
  mutate: (vars: TVars, callbacks?: MutationCallbacks<TData>) => Promise<TData | undefined>;

  /** 是否有正在进行的动作，用于禁用按钮/展示 loading */
  isPending: boolean;
}

/**
 * 异步动作 Hook，把一次提交类操作包装成带 pending 状态、防重入、可选重试的动作
 * @param action 实际执行的动作，接收 vars 返回 Promise
 * @param defaults 默认回调（onSuccess/onError/onSettled），可被单次 mutate 的回调覆盖
 * @param retry 是否启用可重试错误的指数退避重试，默认 false
 * @returns
 * - `mutate`    执行动作的函数，成功返回数据，失败/重入返回 undefined
 * - `isPending` 是否有正在进行的动作
 * @example
 * const { mutate, isPending } = useAsyncAction((id: string) => likePostAction(id).then(unwrap), {
 *   onSuccess: () => toast.success('已点赞'),
 * });
 */
export function useAsyncAction<TVars, TData>(
  action: (vars: TVars) => Promise<TData>,
  defaults?: MutationCallbacks<TData>,
  retry = false,
): AsyncAction<TVars, TData> {
  const [isPending, setIsPending] = useState(false);

  // 用 ref 做同一次动作的并发锁：避免在状态更新前重复触发（不触发重渲染）
  const mutatingRef = useRef(false);

  // 把 defaults 存入 ref 并在每次渲染同步，使 mutate 依赖仅需 [action, retry] 而不会因回调身份变化被重建
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

            if (!retry || !isRetryableError(error) || attempt >= MAX_RETRIES) {
              defaultsRef.current?.onError?.(error);
              callbacks?.onError?.(error);
              return undefined;
            }

            // 指数退避：第 attempt 次失败后等待 RETRY_BASE_DELAY * 2^attempt（ms），单位 ms
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
    [action, retry],
  );

  return { mutate, isPending };
}
