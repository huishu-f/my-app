/**
 * @file use-fetch.ts
 * @description 客户端数据获取 Hook：带并发去重、SWR 缓存与失败重试；相同 key 的多次订阅共享一次请求，可开关、可 refetch
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** stale-while-revalidate 新鲜窗口，单位 ms；窗口内命中缓存则先展示旧数据再后台刷新 */
const SWR_WINDOW = 2_000;

/** 请求失败的最大额外重试次数 */
const MAX_RETRIES = 2;

/** 每次重试之间的固定等待，单位 ms */
const RETRY_DELAY = 1_000;

/** 正在进行中的请求登记项，供相同 key 的订阅者共享，实现并发去重 */
interface InflightEntry {
  /** 共享的请求 Promise，多个订阅者 await 同一结果 */
  promise: Promise<unknown>;

  /** 用于在无人引用时取消底层请求 */
  abort: AbortController;

  /** 当前引用该请求的订阅者数量，归零时取消并移除 */
  refCount: number;
}

/** 模块级进行中的请求登记表：key → 条目，实现跨组件的同请求去重 */
const inflight = new Map<string, InflightEntry>();

/** 模块级 SWR 结果缓存：key → { 数据, 写入时间戳(ms) }，用于新鲜窗口内秒出旧数据 */
const swrCache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * 生成缓存/去重 key
 * @param cacheKey 显式缓存 key，提供时优先使用
 * @param deps 依赖列表，未提供 cacheKey 时用 '::' 拼接作为 key
 * @returns 用于 inflight/swrCache 索引的字符串 key
 */
function makeKey(cacheKey: string | undefined, deps: React.DependencyList): string {
  return cacheKey ?? deps.join('::');
}

/**
 * 释放对某个进行中请求的引用；引用计数归零时取消请求并从登记表移除
 * @param key 请求 key
 */
function releaseInflight(key: string): void {
  const entry = inflight.get(key);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.abort.abort();
    inflight.delete(key);
  }
}

/**
 * 发起或复用一次数据请求，带失败重试与结果缓存
 * @param key 请求 key，用于去重与缓存
 * @param fetcherRef 实际取数函数的 ref（读取最新闭包，避免过期）
 * @returns 请求结果；命中进行中请求则共享其 Promise，共享请求失败时返回 undefined
 */
async function performFetch(
  key: string,
  fetcherRef: React.MutableRefObject<(signal: AbortSignal) => Promise<unknown>>,
): Promise<unknown> {
  // 已有相同 key 的进行中请求：共享它并递增引用计数，不重复发起
  const existing = inflight.get(key);
  if (existing) {
    existing.refCount++;
    try {
      return await existing.promise;
    } catch {
      return undefined;
    }
  }

  // 无进行中请求：新建带 AbortController 的请求，失败按 RETRY_DELAY 重试，成功后写入 SWR 缓存
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

/**
 * useFetch 的返回状态
 * @template T 请求成功后的数据类型
 */
export interface FetchState<T> {
  /** 最近一次成功的数据；尚无数据时为 null */
  data: T | null;

  /** 是否加载中（enabled 为 false 时恒为 false） */
  loading: boolean;

  /** 最近一次请求的错误；无错误时为 null */
  error: Error | null;

  /** 手动重新拉取（enabled 为 false 时无效） */
  refetch: () => void;
}

/**
 * 数据获取 Hook，封装请求状态、并发去重、SWR 缓存与重试
 * @param fetcher 取数函数，接收 AbortSignal 以便被取消
 * @param deps 依赖列表，变化时重新拉取（等价于 useEffect 依赖）
 * @param enabled 是否启用请求，false 时不拉取且 loading 置 false，默认 true
 * @param cacheKey 显式缓存/去重 key；提供时用它，否则用 deps 拼接
 * @returns
 * - `data`    最近一次成功数据，无数据为 null
 * - `loading` 是否加载中
 * - `error`   最近一次错误，无错误为 null
 * - `refetch` 手动重新拉取当前数据
 * @example
 * const { data, loading, error, refetch } = useFetch(() => api.get<Post[]>('/posts'), [], true, 'posts');
 */
export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
  enabled = true,
  cacheKey?: string,
): FetchState<T> {
  /** 最近一次成功的数据 */
  const [data, setData] = useState<T | null>(null);
  /** 加载中标记，初值取 enabled */
  const [loading, setLoading] = useState(enabled);
  /** 最近一次错误 */
  const [error, setError] = useState<Error | null>(null);

  /** 自增计数器，作为 refetch 的触发源写入依赖以重跑请求 */
  const [tick, setTick] = useState(0);

  /** 保存最新 fetcher，避免 effect 因 fetcher 身份变化反复触发 */
  const fetcherRef = useRef(fetcher);

  // 每次渲染同步最新 fetcher 到 ref，供 performFetch 读取最新闭包
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // 监听 enabled/tick/cacheKey/deps：变化时决定用 SWR 缓存秒出还是全新拉取，卸载/依赖变化时释放引用并置 cancelled
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // 标记是否已清理，防止请求回调在组件卸载/依赖变化后继续 setState
    let cancelled = false;
    const key = makeKey(cacheKey, deps);

    // SWR：命中新鲜窗口内的缓存则先用旧数据渲染，再后台 revalidate 刷新
    const cached = swrCache.get(key);
    if (cached && Date.now() - cached.timestamp < SWR_WINDOW) {
      setData(cached.data as T);
      setLoading(false);
      setError(null);

      void performFetch(key, fetcherRef)
        .then((result) => {
          if (!cancelled && result !== undefined) setData(result as T);
          if (!cancelled) setLoading(false);
        })
        .catch(() => {});

      return () => {
        cancelled = true;
        releaseInflight(key);
      };
    }

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

    // 反直觉写法：deps 为动态长度数组，只能在 effect 依赖里展开，否则无法逐项响应变化
  }, [enabled, tick, cacheKey, ...deps]);

  // 通过自增 tick 触发主 effect 重跑，实现手动刷新；enabled 为 false 时不响应
  const refetch = useCallback(() => {
    if (enabled) setTick((t) => t + 1);
  }, [enabled]);

  return { data, loading, error, refetch };
}
