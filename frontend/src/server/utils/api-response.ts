/**
 * @file api-response.ts
 * @description API 统一响应封装，提供成功/失败响应的 JSON 格式与公开接口 CDN 缓存头；仅服务端路由使用
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { AppError, InternalServerError } from '@server/errors';
import { logger } from '@server/utils/logger';

/**
 * 发送统一成功响应
 * @param data 响应数据
 * @param message 提示信息，默认 '操作成功'
 * @param status HTTP 状态码，默认 200
 * @param init 附加配置，可传入自定义响应头
 * @returns NextResponse JSON 响应
 */
export function sendSuccess<T>(
  data: T,
  message = '操作成功',
  status = 200,
  init?: { headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json({ code: 0, data, message }, { status, headers: init?.headers });
}

/**
 * 生成公开只读接口的 CDN 缓存头，s-maxage 秒内 CDN 命中直接返回，过期后 30s 内先返旧响应再后台刷新（SWR），仅用于无个性化（不含 Cookie 依赖）的公开响应
 * @param sMaxAge CDN 缓存秒数，应与 fetch Data Cache 的 revalidate 值对齐
 * @returns Cache-Control 响应头
 */
export function publicCacheHeaders(sMaxAge: number): Record<string, string> {
  return { 'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=30` };
}

/**
 * 发送创建成功响应
 * @param data 响应数据
 * @param message 提示信息，默认 '创建成功'
 * @returns NextResponse JSON 响应，状态码为 201
 */
export function sendCreated<T>(data: T, message = '创建成功'): NextResponse {
  return sendSuccess(data, message, 201);
}

/**
 * 发送统一错误响应
 * @param err 任意异常，AppError 之外统一包装为 InternalServerError
 * @returns 统一错误格式的 NextResponse JSON 响应
 */
export function sendError(err: unknown): NextResponse {
  // Turbopack 将服务端代码拆分为多个 chunk，跨 chunk 的 instanceof AppError
  // 检查会因类引用不同而失败，改用鸭子类型判断，兼容多 chunk 打包
  const isAppError =
    err !== null &&
    typeof err === 'object' &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (err as { code?: unknown }).code === 'string';
  const appError = isAppError
    ? (err as AppError)
    : new InternalServerError(err instanceof Error ? err.message : 'Internal server error');

  if (appError.statusCode >= 500) {
    logger.error(appError.message, {
      code: appError.code,
      statusCode: appError.statusCode,
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    logger.warn(appError.message, { code: appError.code, statusCode: appError.statusCode });
  }

  // 前端通过 HTTP status code 判断错误，body.message 提供错误信息
  return NextResponse.json(
    {
      code: appError.statusCode,
      data: null,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
    { status: appError.statusCode },
  );
}
