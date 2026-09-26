import { ApiRequestError } from "@my-app/shared";
export { ApiRequestError };
import type { ApiResponse, RequestOptions, ValidationErrorDetail } from "@my-app/shared";
import { currentMsgLocale, msg } from "@/lib/message";

const DEFAULT_TIMEOUT = 15_000;

const BASE_URL = "/api";

const NET_RETRY_DELAY_MS = 400;

const SAFE_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

let authRedirecting = false;

let authRedirectTimer: ReturnType<typeof setTimeout> | null = null;

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
 * ponytail: 客户端专用。此前还有一条 typeof window === "undefined" 的服务端分支，
 * 会用 SITE_URL（默认 http://localhost:3000）拼绝对地址 —— 一旦有人在 Server Component
 * 里调用就会在线上请求自身 localhost。两个调用点都是 "use client"，该分支从未执行过，
 * 直接删除；今后若在服务端调用，相对 URL 会立刻响亮失败而不是静默打错主机。
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
  _retryDepth = 0,
  _netRetried = false,
): Promise<T> {
  const { body, query, headers, skipAuthRedirect, ...rest } = options;

  const method = (rest.method ?? "GET").toUpperCase();
  const url = buildUrl(path, query);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  const combinedSignal = rest.signal
    ? AbortSignal.any([rest.signal, controller.signal])
    : controller.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      signal: combinedSignal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";

    const isCallerAbort = isAbort && !!options.signal?.aborted;

    const isTransient = !isCallerAbort;

    if (isTransient && !_netRetried && SAFE_RETRY_METHODS.has(method)) {
      await sleep(NET_RETRY_DELAY_MS);
      return request<T>(path, options, _retryDepth, true);
    }

    if (isAbort) {
      if (isCallerAbort) {
        throw new ApiRequestError(0, 0, "Request aborted");
      }
      throw new ApiRequestError(0, 0, msg("common", "timeout"));
    }

    throw new ApiRequestError(0, 0, msg("common", "networkError"));
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: (ApiResponse<T> & { details?: ValidationErrorDetail[] }) | null = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiRequestError(
        res.status,
        res.status,
        msg("common", "requestFailed", { status: res.status }),
      );
    }
  }

  if (res.ok && payload && payload.code === 0) {
    return payload.data;
  }

  if (res.status === 401 && !skipAuthRedirect && _retryDepth < 1) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, options, _retryDepth + 1);
    }

    if (!authRedirecting) {
      authRedirecting = true;

      if (authRedirectTimer) clearTimeout(authRedirectTimer);
      authRedirectTimer = setTimeout(() => {
        authRedirecting = false;
        authRedirectTimer = null;
      }, 5000);
      const currentPath = window.location.pathname + window.location.search;

      const prefix = `/${currentMsgLocale()}`;
      window.location.replace(`${prefix}/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }

  const message = payload?.message || msg("common", "requestFailed", { status: res.status });
  throw new ApiRequestError(res.status, payload?.code ?? res.status, message, payload?.details);
}

export const api = {
  get: <T>(
    path: string,
    query?: RequestOptions["query"],
    opts?: {
      skipAuthRedirect?: boolean;

      revalidate?: number;

      tags?: string[];

      signal?: AbortSignal;
    },
  ) => {
    const { revalidate, tags, ...rest } = opts ?? {};

    const hasNextOpts = revalidate !== undefined || (tags?.length ?? 0) > 0;
    return request<T>(path, {
      method: "GET",
      query,
      ...rest,
      ...(hasNextOpts
        ? { next: { revalidate: revalidate ?? 0, ...(tags?.length ? { tags } : {}) } }
        : {}),
    });
  },

  post: <T>(path: string, body?: unknown, opts?: { skipAuthRedirect?: boolean }) =>
    request<T>(path, { method: "POST", body, ...opts }),
};
