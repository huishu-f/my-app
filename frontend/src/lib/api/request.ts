/**
 * @file 同构请求层
 * @description 基于 fetch 的统一请求封装，客户端与服务端共用：
 *              统一处理 BaseURL 拼接、HttpOnly Cookie 鉴权转发、超时控制、
 *              错误归一化（ApiRequestError）、401 自动刷新 Token 与重定向登录。
 *              响应约定（对齐后端 API.md）：
 *              - 成功响应 { code: 0, data, message } → 返回 data
 *              - 错误响应 { code, message, details? } → 抛出 ApiRequestError
 *              - HTTP 状态码：400 校验失败 / 401 未授权 / 403 禁止 / 404 不存在 /
 *                409 冲突 / 422 实体无法处理 / 500 服务器错误 / 503 服务不可用
 */
import { ApiRequestError } from '@my-app/shared';
export { ApiRequestError };
import type { ApiResponse, RequestOptions, ValidationErrorDetail } from '@my-app/shared';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-constants';
import { SITE_URL } from '@/config/site';

/** 鉴权 Cookie 名称（与服务端 auth-cookie.helper 经 lib/auth-constants.ts 共享） */
export const AUTH_COOKIE = AUTH_TOKEN_COOKIE;
/** 请求默认超时时间，单位ms */
const DEFAULT_TIMEOUT = 15_000;

/** 接口基础地址：API Routes 与前端同域部署，客户端与服务端统一使用 /api */
const BASE_URL = '/api';

/** 底层错误消息双语字典（同构层无法使用 React 上下文，按当前 locale 取文案） */
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
 * 解析当前语言偏好
 * @returns 客户端按 URL 路径前缀判定（/en → en，其余 → zh）；服务端恒返回 zh
 * @description 服务端抛出的底层错误极少直接展示给用户（后端业务 message 才是主要来源），
 *              故服务端不做语言推断
 */
function currentLocale(): 'zh' | 'en' {
  if (typeof window !== 'undefined') {
    return window.location.pathname.startsWith('/en') ? 'en' : 'zh';
  }
  return 'zh';
}

/**
 * 获取当前语言的底层错误消息字典
 * @returns 当前 locale 对应的错误消息集合
 */
function errorMessages() {
  return ERROR_MESSAGES[currentLocale()];
}

/**
 * 服务端请求时读取 httpOnly Cookie 并转发给后端
 * @returns Cookie 字符串（如 "auth_token=xxx"）；客户端运行或无 token 时返回 undefined
 * @description 动态 import next/headers，避免将服务端模块打包进客户端产物
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
 * 构建客户端请求 URL
 * @param path 接口路径（以 / 开头）
 * @param query 查询参数对象（自动过滤 null / undefined / 空字符串）
 * @returns BASE_URL + path + querystring 的完整 URL
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
 * 构建服务端请求 URL（绝对地址）
 * @param path 接口路径（以 / 开头）
 * @param query 查询参数对象
 * @returns 服务端可直接 fetch 的绝对 URL
 * @description Netlify serverless 环境下 Server Component 内相对路径 fetch 会失败，必须拼绝对 URL。
 *              优先使用 NEXT_PUBLIC_BASE_URL 环境变量（不访问请求头，页面可静态渲染/ISR），
 *              缺失时回退读取请求头（会使渲染动态化），最终兜底 SITE_URL。
 * @warning 生产环境必须将 NEXT_PUBLIC_BASE_URL 配置为真实域名，否则自动回退动态渲染（仅损失缓存优化）
 */
async function buildServerUrl(path: string, query?: RequestOptions['query']): Promise<string> {
  const relativeUrl = buildUrl(path, query);

  // 优先：环境变量配置的 base URL（不触发动态 API，静态渲染友好）
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}${relativeUrl}`;

  // 兜底：从请求头获取 host（Netlify 会设置 x-forwarded-host / x-forwarded-proto）。
  // 注意：headers() 是动态 API，调用会使当前渲染树变为动态（每请求 SSR）
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto =
      h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    if (host) return `${proto}://${host}${relativeUrl}`;
  } catch {
    // headers() 不可用（非 Next.js 上下文），fallback
  }

  // 最终 fallback：使用 SITE_URL（与 site.ts 同源，默认 localhost:3000）
  return `${SITE_URL.replace(/\/$/, '')}${relativeUrl}`;
}

/** 客户端 401 重定向防抖锁，避免多个并行请求同时触发跳转 */
let authRedirecting = false;
/** authRedirecting 的安全重置定时器，防止锁泄漏 */
let authRedirectTimer: ReturnType<typeof setTimeout> | null = null;

/** Token 刷新锁：保证多个 401 并行请求只触发一次刷新 */
let refreshPromise: Promise<boolean> | null = null;

/**
 * 尝试刷新 Token
 * @returns 刷新成功且业务 code 为 0 返回 true，否则返回 false
 * @description 调用 /api/auth/refresh；已有刷新在进行时复用同一个 Promise，
 *              请求带 15s 超时，任何异常均归为失败
 */
async function tryRefreshToken(): Promise<boolean> {
  // 已有刷新请求在进行中，复用同一个 Promise
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
 * 发起请求并返回响应的 data 部分
 * @param path 接口路径（以 / 开头）
 * @param options 请求配置（method / body / query / headers / 超时 / skipAuthRedirect / skipAuth / signal 等）
 * @param _retryDepth 内部参数：401 刷新后重试的深度，防止无限重试（外部不要传）
 * @returns 后端响应中的 data 字段
 * @throws ApiRequestError 任何非 2xx、业务 code 非 0、超时或网络错误均抛出；
 *                         外部 signal 主动中止时抛出 code 0 的 'Request aborted'
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
  _retryDepth = 0,
): Promise<T> {
  const { body, query, headers, skipAuthRedirect, skipAuth, signal, ...rest } = options;

  // 服务端使用绝对 URL（Netlify serverless 不支持相对路径 fetch），客户端使用相对路径
  const isServer = typeof window === 'undefined';
  const url = isServer ? await buildServerUrl(path, query) : buildUrl(path, query);

  // 服务端：转发 httpOnly Cookie。
  // skipAuth 用于纯公开数据请求：跳过 cookies() 动态 API，使页面可静态渲染/ISR；
  // 同时避免带 Cookie 的响应进入 Data Cache 造成跨用户数据污染
  const serverCookie = skipAuth ? undefined : await getServerCookieHeader();

  // 请求超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      signal: combinedSignal,
      credentials: typeof window !== 'undefined' ? 'include' : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(serverCookie ? { Cookie: serverCookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 区分超时（内部 controller 触发）与外部取消（调用方 signal 触发）：
      // 外部 signal abort = 组件卸载 / 依赖变化主动取消，不是错误；
      // 内部 controller abort = 请求超时。
      if (signal?.aborted) {
        throw new ApiRequestError(0, 0, 'Request aborted');
      }
      throw new ApiRequestError(0, 0, errorMessages().timeout);
    }
    // 网络错误 / 后端未启动
    throw new ApiRequestError(0, 0, errorMessages().network);
  } finally {
    clearTimeout(timeoutId);
  }

  // 解析 JSON（容错：后端可能返回非 JSON）
  let payload: (ApiResponse<T> & { details?: ValidationErrorDetail[] }) | null = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // 非 JSON，按状态码抛出
      throw new ApiRequestError(res.status, res.status, errorMessages().requestFailed(res.status));
    }
  }

  // 成功：2xx 且业务 code 为 0
  if (res.ok && payload && payload.code === 0) {
    return payload.data;
  }

  // 401 客户端：尝试刷新 Token 后重试（最多一次），失败则重定向登录
  if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined' && _retryDepth < 1) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // 刷新成功，重试原始请求
      return request<T>(path, options, _retryDepth + 1);
    }
    // 刷新失败，重定向到登录页
    if (!authRedirecting) {
      authRedirecting = true;
      // 安全重置：5 秒后清除锁，防止因重定向未执行导致锁永久泄漏
      if (authRedirectTimer) clearTimeout(authRedirectTimer);
      authRedirectTimer = setTimeout(() => {
        authRedirecting = false;
        authRedirectTimer = null;
      }, 5000);
      const currentPath = window.location.pathname + window.location.search;
      // replace 而非 href 赋值：href 会留下当前 401 页的历史，
      // 返回键回来再次 401 再被踢回登录页，形成死循环
      window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }

  const message = payload?.message || errorMessages().requestFailed(res.status);
  throw new ApiRequestError(res.status, payload?.code ?? res.status, message, payload?.details);
}

/**
 * 便捷请求方法集合
 * @description 封装 GET/POST/PUT/DELETE 快捷调用，自动填入 method
 */
export const api = {
  /**
   * GET 请求
   * @param path 接口路径
   * @param query 查询参数对象
   * @param opts 额外选项
   * @returns 响应 data
   * @description 支持 Next.js 服务端 fetch 扩展：revalidate 缓存秒数与 tags 缓存标签
   */
  get: <T>(
    path: string,
    query?: RequestOptions['query'],
    opts?: {
      /** 跳过 401 重定向（如登录页自身） */
      skipAuthRedirect?: boolean;
      /** Next.js Data Cache 重验证秒数 */
      revalidate?: number;
      /** fetch 缓存标签，写操作可通过 revalidateTag 按需失效 */
      tags?: string[];
      /** 服务端跳过 Cookie 转发（公开数据专用，避免触发 cookies() 动态 API） */
      skipAuth?: boolean;
      /** 中止信号（组件卸载/依赖变化时取消在途请求，防内存泄漏） */
      signal?: AbortSignal;
      /** fetch 缓存策略（'default' | 'force-cache' | 'no-store' | 'only-cache'） */
      cache?: RequestCache;
    },
  ) => {
    const { revalidate, tags, ...rest } = opts ?? {};
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
   * POST 请求
   * @param path 接口路径
   * @param body 请求体（自动 JSON 序列化）
   * @param opts 额外选项
   * @returns 响应 data
   */
  post: <T>(path: string, body?: unknown, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: 'POST', body, ...opts }),
  /**
   * PUT 请求
   * @param path 接口路径
   * @param body 请求体（自动 JSON 序列化）
   * @param opts 额外选项
   * @returns 响应 data
   */
  put: <T>(path: string, body?: unknown, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: 'PUT', body, ...opts }),
  /**
   * DELETE 请求
   * @param path 接口路径
   * @param opts 额外选项
   * @returns 响应 data
   */
  delete: <T>(path: string, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: 'DELETE', ...opts }),
};
