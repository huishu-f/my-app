/**
 * @file use-fetch.ts
 * @description 通用数据获取 hook — 以原生 React（useState + useEffect）+ fetch API 封装
 *              data / loading / error 三态与 refetch。
 *              内置特性：
 *              - 请求去重：模块级 in-flight Map，相同 cacheKey 的并发请求共享同一个 Promise
 *                引用计数管理：组件卸载时仅递减计数，计数归零才 abort，避免误杀共享请求
 *              - SWR 语义：短时间窗口内（默认 2s）重复请求返回缓存数据，后台静默刷新
 *              - AbortController 取消语义：依赖变化与组件卸载时中止未完成请求
 *
 *              ⚠️ cacheKey 设计：调用方应传入显式 cacheKey（如 'comments:postId'），
 *              避免生产构建 minify 后 fetcher.toString() 碰撞。
 *              未传 cacheKey 时回退到 deps.join('::')。
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** SWR 窗口：短时间内重复请求返回缓存，后台静默刷新 */
const SWR_WINDOW = 2_000;

/** 最大重试次数 */
const MAX_RETRIES = 2;
/** 重试间隔（毫秒）— 固定延迟，非指数退避 */
const RETRY_DELAY = 1_000;

/** in-flight 请求条目（含引用计数） */
interface InflightEntry {
  promise: Promise<unknown>;
  abort: AbortController;
  /** 引用计数：多个组件共享同一请求时，仅当计数归零才 abort 并删除 */
  refCount: number;
}

/** 模块级 in-flight 请求表：key → InflightEntry，并发请求去重 */
const inflight = new Map<string, InflightEntry>();

/** 模块级 SWR 缓存：key → { data, timestamp }，短时间窗口内返回缓存 */
const swrCache = new Map<string, { data: unknown; timestamp: number }>();

/** 生成请求唯一 key：优先用显式 cacheKey，回退到 deps 拼接 */
function makeKey(cacheKey: string | undefined, deps: React.DependencyList): string {
  return cacheKey ?? deps.join('::');
}

/** 递减引用计数，计数归零时 abort 并清理 in-flight 条目（不影响 SWR 缓存） */
function releaseInflight(key: string): void {
  const entry = inflight.get(key);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.abort.abort();
    inflight.delete(key);
  }
}

/** 执行单次请求（含 in-flight 去重） */
async function performFetch(
  key: string,
  fetcherRef: React.MutableRefObject<(signal: AbortSignal) => Promise<unknown>>,
): Promise<unknown> {
  // 去重：相同 key 的请求复用同一个 Promise，并递增引用计数
  const existing = inflight.get(key);
  if (existing) {
    existing.refCount++;
    try {
      return await existing.promise;
    } catch {
      return undefined;
    }
  }

  // 发起新请求
  const controller = new AbortController();
  const promise = (async (): Promise<unknown> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await fetcherRef.current(controller.signal);
        if (!controller.signal.aborted) {
          swrCache.set(key, { data: result, timestamp: Date.now() });
        }
        return result;
      } catch (err) {
        lastError = err;
        if (controller.signal.aborted) throw err;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
        }
      }
    }
    throw lastError;
  })();

  inflight.set(key, { promise, abort: controller, refCount: 1 });
  return promise;
}

/** useFetch 返回的数据状态 */
export interface FetchState<T> {
  /** 响应数据，未完成或失败时为 null */
  data: T | null;
  /** 是否加载中（含 refetch 触发的重新请求） */
  loading: boolean;
  /** 请求失败时的错误对象，成功后重置为 null */
  error: Error | null;
  /** 手动重新获取 */
  refetch: () => void;
}

/**
 * 通用数据获取 hook
 * @param fetcher 请求函数（接收 AbortSignal，可透传给底层 fetch 以真正中断网络请求）
 * @param deps 重新获取的依赖数组（如 [postId]）——调用方负责粒度，语义同 useEffect 依赖
 * @param enabled 是否启用请求（false 时不发请求、loading 立即为 false）
 * @param cacheKey 显式缓存键（推荐传入，如 'comments:postId'），未传时回退到 deps.join('::')
 *                 生产构建 minify 后 fetcher.toString() 可能碰撞，显式 key 可避免此问题
 * @returns {@link FetchState} data / loading / error / refetch
 */
export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
  enabled = true,
  cacheKey?: string,
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  /** refetch 自增计数，触发 effect 重新执行 */
  const [tick, setTick] = useState(0);
  /** 保持 fetcher 最新引用而不触发重新请求 */
  const fetcherRef = useRef(fetcher);

  /** 同步最新 fetcher（effect 内写入，避免渲染期访问 ref；先于请求 effect 声明） */
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    /** 闭包取消标志：cleanup 时置 true，阻止卸载后的异步回调更新状态 */
    let cancelled = false;
    const key = makeKey(cacheKey, deps);

    /** SWR 命中：短时间窗口内返回缓存数据，后台静默刷新 */
    const cached = swrCache.get(key);
    if (cached && Date.now() - cached.timestamp < SWR_WINDOW) {
      setData(cached.data as T);
      setLoading(false);
      setError(null);
      // 后台静默刷新（不阻塞 UI，不设置 loading）
      void performFetch(key, fetcherRef).then((result) => {
        if (!cancelled && result !== undefined) setData(result as T);
        if (!cancelled) setLoading(false);
      }).catch(() => {
        // 后台刷新失败静默忽略（缓存数据仍可用）
      });
      // SWR 路径也需要清理：performFetch 已注册 refCount=1，cleanup 需释放
      return () => {
        cancelled = true;
        releaseInflight(key);
      };
    }

    /** 执行请求（含去重检查） */
    setLoading(true);
    setError(null);
    performFetch(key, fetcherRef)
      .then((result) => {
        if (cancelled) return;
        if (result !== undefined) {
          setData(result as T);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      releaseInflight(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方显式传入，控制重取时机
  }, [enabled, tick, cacheKey, ...deps]);

  /** 手动重新获取（自增 tick 触发 effect） */
  const refetch = useCallback(() => {
    if (enabled) setTick((t) => t + 1);
  }, [enabled]);

  return { data, loading, error, refetch };
}
