/**
 * @file request.ts
 * @description 统一 API 请求层：封装 fetch，处理超时/网络错误、业务 code 判错、401 自动刷新 token 与登录跳转，并提供 api.get/post/put/delete；同构适配 SSR（服务端拼绝对地址+转发 Cookie）与浏览器（相对地址+credentials）。业务失败与网络异常统一抛 ApiRequestError
 */

import { ApiRequestError } from '@my-app/shared';
export { ApiRequestError };
import type { ApiResponse, RequestOptions, ValidationErrorDetail } from '@my-app/shared';
import { AUTH_TOKEN_COOKIE } from '@my-app/shared/lib/auth-constants';
import { SITE_URL } from '@/config/site';

/** 鉴权 Cookie 名的别名导出，指向 auth-constants 的哨兵字符串 */
export const AUTH_COOKIE = AUTH_TOKEN_COOKIE;

/** fetch 默认超时时间，单位 ms（15 秒），到时经 AbortController 中断并转成超时错误 */
const DEFAULT_TIMEOUT = 15_000;

/** 浏览器端请求的 API 路径前缀（相对当前站点）；服务端会另拼绝对地址 */
const BASE_URL = '/api';

/** 瞬时网络/超时错误自动重试前的退避时长（ms）——仅对幂等安全方法生效 */
const NET_RETRY_DELAY_MS = 400;

/**
 * 可安全自动重试的幂等 HTTP 方法集合。
 * Netlify 冷启动/边缘偶发连接重置会让首屏读请求失败（fetch 抛网络错误、无 HTTP 响应），
 * 对 GET/HEAD/OPTIONS 退避后重试一次即可自愈；写方法不重试以免重复提交。
 */
const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * 延时工具
 * @param ms 毫秒数
 * @returns ms 后 resolve 的 Promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 请求层错误的中英文文案表，按当前 locale 选取；requestFailed 为携带状态码的模板函数 */
const ERROR_MESSAGES = {
  zh: {
    timeout: '请求超时，请稍后重试',
    network: '网络请求失败，请检查服务是否可用',
    requestFailed: (status: number) => `请求失败（${status}）`,
  },
  en: {
    timeout: 'Request timed out, please try again later',
    network: 'Network request failed, please check if the service is available',
    requestFailed: (status: number) => `Request failed (${status})`,
  },
} as const;

/**
 * 读取当前语言：浏览器端按 URL 前缀判断（/en 开头为英文），服务端默认中文
 * @returns 'zh' 或 'en'
 */
function currentLocale(): 'zh' | 'en' {
  if (typeof window !== 'undefined') {
    return window.location.pathname.startsWith('/en') ? 'en' : 'zh';
  }
  return 'zh';
}

/**
 * 取得当前语言对应的错误文案集合
 * @returns ERROR_MESSAGES 中匹配 currentLocale 的一组文案
 */
function errorMessages() {
  return ERROR_MESSAGES[currentLocale()];
}

/**
 * 仅在服务端运行：读取鉴权 Cookie 拼成转发给内部 API 的 Cookie 请求头
 * @returns 形如 `auth_token=...` 的头值；浏览器端、无 token 或读取失败时返回 undefined
 */
async function getServerCookieHeader(): Promise<string | undefined> {
  if (typeof window !== 'undefined') return undefined;
  try {
    const { cookies: nextCookies } = await import('next/headers');
    const cookieStore = await nextCookies();
    const authToken = cookieStore.get(AUTH_COOKIE)?.value;
    if (!authToken) return undefined;
    return `${AUTH_COOKIE}=${authToken}`;
  } catch {
    return undefined;
  }
}

/**
 * 拼接浏览器端相对请求 URL 并追加 query
 * @param path 以 / 开头的接口路径
 * @param query 查询参数，值为 null/undefined/空串时跳过
 * @returns `${BASE_URL}${path}?...`；无有效参数时不含 ?
 */
function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * 服务端专用：把相对路径补成绝对 URL（SSR 内部 fetch 需完整地址）
 * @param path 以 / 开头的接口路径
 * @param query 查询参数
 * @returns 优先用 NEXT_PUBLIC_BASE_URL，其次请求头 host/proto，最后回退 SITE_URL 拼成的绝对地址
 */
async function buildServerUrl(path: string, query?: RequestOptions['query']): Promise<string> {
  const relativeUrl = buildUrl(path, query);

  // 优先用显式配置的基础地址，去掉结尾多余的 /
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}${relativeUrl}`;

  // 否则从当前请求头推断 host 与协议（生产默认 https），拼出绝对地址
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto =
      h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    if (host) return `${proto}://${host}${relativeUrl}`;
  } catch {
    // 读取 headers 不可用（如静态渲染上下文），忽略并走下面的 SITE_URL 兜底
  }

  // 最终兜底：用站点配置的 SITE_URL
  return `${SITE_URL.replace(/\/$/, '')}${relativeUrl}`;
}

/** 浏览器端全局标记：是否正在进行登录重定向，防止并发 401 触发多次跳转 */
let authRedirecting = false;

/** 重置 authRedirecting 的定时器句柄，单位 ms 延时（见 tryRefreshToken 下方的 5000） */
let authRedirectTimer: ReturnType<typeof setTimeout> | null = null;

/** 进行中的 token 刷新 Promise，供并发请求共享同一次刷新，刷新结束后置回 null */
let refreshPromise: Promise<boolean> | null = null;

/**
 * 调用 /api/auth/refresh 续期鉴权 Cookie，多个并发请求共享同一刷新 Promise
 * @returns 刷新成功（响应 ok 且业务 code 为 0）返回 true，其余情况返回 false；不抛异常
 */
async function tryRefreshToken(): Promise<boolean> {
  // 已有进行中的刷新则直接复用，避免并发重复请求刷新接口
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const payload = await res.json();
      return payload?.code === 0;
    } catch {
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * 发起一次 API 请求：统一处理超时/网络错误、业务 code 判错、401 自动刷新与登录重定向
 * @param path 以 / 开头的接口路径（相对 BASE_URL）
 * @param options 请求选项，含 body/query/headers/skipAuth/skipAuthRedirect/signal 等
 * @param _retryDepth 内部递归重试深度（401 刷新成功后重放一次），外部勿传，超过 1 不再自动重试
 * @param _netRetried 内部标记：本次是否已因瞬时网络/超时错误重试过一次，仅对幂等安全方法生效，外部勿传
 * @returns 响应体中的 data（业务 code 为 0 时）
 * @throws ApiRequestError：网络/超时（status/code 均为 0）、响应体非法 JSON（用 HTTP status）、或业务 code 非 0/HTTP 非 2xx（携带 status、业务 code、message 与可选校验详情）
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
  _retryDepth = 0,
  _netRetried = false,
): Promise<T> {
  const { body, query, headers, skipAuthRedirect, skipAuth, signal, ...rest } = options;

  // 有效 HTTP 方法（大写，缺省 GET），供瞬时错误的幂等重试判定
  const method = (rest.method ?? 'GET').toUpperCase();

  // 同构：服务端拼绝对 URL（SSR 内部 fetch 需完整地址），浏览器端用相对 URL
  const isServer = typeof window === 'undefined';
  const url = isServer ? await buildServerUrl(path, query) : buildUrl(path, query);

  // 服务端需手动转发鉴权 Cookie（fetch 不自动带）；skipAuth 的公开接口不转发，以免触发动态 API 破坏 ISR/静态化
  const serverCookie = skipAuth ? undefined : await getServerCookieHeader();

  // 超时保护：到 DEFAULT_TIMEOUT 后 abort；若调用方也传了 signal，则合并两者以同时响应外部取消与内部超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      signal: combinedSignal,
      // 浏览器端带 Cookie（credentials: include）；服务端为 undefined，改由手动 Cookie 头转发
      credentials: typeof window !== 'undefined' ? 'include' : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(serverCookie ? { Cookie: serverCookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    // 调用方主动取消（signal.aborted）不属瞬时错误，绝不重试
    const isCallerAbort = isAbort && !!signal?.aborted;
    // 非调用方取消的 AbortError（内部超时）与其它 fetch 抛错（网络层失败）均视为可自愈的瞬时错误
    const isTransient = !isCallerAbort;

    // 幂等安全方法遇瞬时错误（Netlify 冷启动/边缘偶发连接重置）退避后自动重试一次；
    // 写方法与非幂等场景不重试，避免重复提交
    if (isTransient && !_netRetried && SAFE_RETRY_METHODS.has(method)) {
      await sleep(NET_RETRY_DELAY_MS);
      return request<T>(path, options, _retryDepth, true);
    }

    if (isAbort) {
      // AbortError 需区分：调用方主动取消(signal.aborted) 抛"aborted"，否则视为内部超时
      if (isCallerAbort) {
        throw new ApiRequestError(0, 0, 'Request aborted');
      }
      throw new ApiRequestError(0, 0, errorMessages().timeout);
    }

    // 非 AbortError 一律视为网络层失败
    throw new ApiRequestError(0, 0, errorMessages().network);
  } finally {
    clearTimeout(timeoutId);
  }

  // 先读 text 再手动 JSON.parse，兼容空响应体；解析失败说明非约定 JSON（如网关 HTML 错误页）
  let payload: (ApiResponse<T> & { details?: ValidationErrorDetail[] }) | null = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // 响应体不是合法 JSON：以 HTTP status 同时作为 status 与 code 抛出
      throw new ApiRequestError(res.status, res.status, errorMessages().requestFailed(res.status));
    }
  }

  // 仅 HTTP 2xx 且业务 code 为 0 才算成功，返回 data
  if (res.ok && payload && payload.code === 0) {
    return payload.data;
  }

  // 401 且非探测接口、浏览器端、未重试过：先尝试刷新 token，失败再跳登录（skipAuthRedirect 可跳过，用于 /auth/me 等）
  if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined' && _retryDepth < 1) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // 刷新成功：重放原请求一次，_retryDepth 递增防止无限递归
      return request<T>(path, options, _retryDepth + 1);
    }

    // 刷新失败，跳转登录；authRedirecting 作冷却闸门，避免并发 401 触发多次跳转
    if (!authRedirecting) {
      authRedirecting = true;

      // 5 秒（5000 ms）后重置冷却，允许后续再次触发跳转
      if (authRedirectTimer) clearTimeout(authRedirectTimer);
      authRedirectTimer = setTimeout(() => {
        authRedirecting = false;
        authRedirectTimer = null;
      }, 5000);
      const currentPath = window.location.pathname + window.location.search;

      // 记录当前路径作登录后回跳目标；登录页地址带当前 locale 前缀，
      // 否则 localePrefix:'always' 下无前缀 /login 会被重定向到默认语言页，英文用户语言状态丢失
      const prefix = currentLocale() === 'en' ? '/en' : '/zh';
      window.location.replace(`${prefix}/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }

  // 其余失败：优先用后端 message，兜底用状态码文案；携带业务 code 与可选校验详情
  const message = payload?.message || errorMessages().requestFailed(res.status);
  throw new ApiRequestError(res.status, payload?.code ?? res.status, message, payload?.details);
}

/** 按 HTTP 方法封装的便捷请求器，内部均转调 request */
export const api = {
  /**
   * 发起 GET 请求，支持 Next.js 的 revalidate/tags 缓存配置
   * @param path 接口路径
   * @param query 查询参数
   * @param opts 选项：鉴权重定向/转发控制与 Next 缓存字段
   * @returns 响应 data
   * @throws ApiRequestError 同 request
   */
  get: <T>(
    path: string,
    query?: RequestOptions['query'],
    opts?: {
      /** 跳过 401 自动登录重定向（探测型接口用） */
      skipAuthRedirect?: boolean;

      /** ISR 重新验证周期，单位秒；0 表示不缓存 */
      revalidate?: number;

      /** 需按 tag 失效缓存的标签列表 */
      tags?: string[];

      /** 服务端跳过鉴权 Cookie 转发 */
      skipAuth?: boolean;

      /** 外部取消信号 */
      signal?: AbortSignal;

      /** fetch 缓存策略 */
      cache?: RequestCache;
    },
  ) => {
    const { revalidate, tags, ...rest } = opts ?? {};
    // 仅当显式传入 revalidate 或非空 tags 时才附加 next 缓存配置
    const hasNextOpts = revalidate !== undefined || (tags?.length ?? 0) > 0;
    return request<T>(path, {
      method: 'GET',
      query,
      ...rest,
      ...(hasNextOpts
        ? { next: { revalidate: revalidate ?? 0, ...(tags?.length ? { tags } : {}) } }
        : {}),
    });
  },

  /**
   * 发起 POST 请求，body 会被自动 JSON 序列化
   * @param path 接口路径
   * @param body 请求体，可选
   * @param opts 选项（支持 skipAuthRedirect）
   * @returns 响应 data
   * @throws ApiRequestError 同 request
   */
  post: <T>(path: string, body?: unknown, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: 'POST', body, ...opts }),

  /**
   * 发起 PUT 请求
   * @param path 接口路径
   * @param body 请求体，可选
   * @param opts 选项（支持 skipAuthRedirect）
   * @returns 响应 data
   * @throws ApiRequestError 同 request
   */
  put: <T>(path: string, body?: unknown, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: 'PUT', body, ...opts }),

  /**
   * 发起 DELETE 请求
   * @param path 接口路径
   * @param opts 选项（支持 skipAuthRedirect）
   * @returns 响应 data
   * @throws ApiRequestError 同 request
   */
  delete: <T>(path: string, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: 'DELETE', ...opts }),
};
