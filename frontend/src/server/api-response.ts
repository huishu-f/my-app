/**
 * @file api-response.ts
 * @description 统一 API 响应封装：成功体/错误体的 NextResponse 构造与共享缓存响应头，错误体附带日志分级
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { isAppError, InternalServerError } from '@my-app/backend/errors';
import { logger } from '@my-app/backend/utils/logger';

/**
 * 构造统一成功响应：body 形如 { code: 0, data, message }
 * @param message 提示文案，默认 '操作成功'
 * @param status HTTP 状态码，默认 200
 * @param init 可选响应配置，目前用于附加自定义 headers
 * @returns 携带 JSON body 的 NextResponse
 * @template T 业务数据类型
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
 * 生成公共 CDN/边缘缓存响应头
 * @param sMaxAge 强缓存时长，单位秒（写入 Cache-Control 的 s-maxage）
 * @returns header 映射；stale-while-revalidate 固定为 30 秒（后台过期仍可返回旧值并异步刷新）
 */
export function publicCacheHeaders(sMaxAge: number): Record<string, string> {
  return { 'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=30` };
}

/**
 * 构造 201 创建成功响应（复用 sendSuccess，仅状态码不同）
 * @param message 提示文案，默认 '创建成功'
 * @returns HTTP 201 的 NextResponse
 * @template T 业务数据类型
 */
export function sendCreated<T>(data: T, message = '创建成功'): NextResponse {
  return sendSuccess(data, message, 201);
}

/**
 * 将任意异常归一化为统一错误响应
 * @param err 捕获到的未知异常；非 AppError 会包装为 500 InternalServerError
 * @returns 形如 { code, data: null, message, details? } 的 JSON 响应，status 取错误 statusCode
 */
export function sendError(err: unknown): NextResponse {
  // 用 isAppError 而非裸 instanceof：错误类被 Turbopack 分别打进各路由 chunk 后，
  // 跨 chunk 的 instanceof 恒为 false，会把 service 层抛出的 4xx 业务错误整体降级成 500
  const appError = isAppError(err)
    ? err
    : new InternalServerError(err instanceof Error ? err.message : 'Internal server error');

  // 5xx 视为服务端故障按 error 记录并附堆栈；4xx 属预期客户端错误按 warn 记录
  if (appError.statusCode >= 500) {
    logger.error(appError.message, {
      code: appError.code,
      statusCode: appError.statusCode,
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    logger.warn(appError.message, { code: appError.code, statusCode: appError.statusCode });
  }

  // 5xx 的 message 可能含内部细节（键名/底层错误串），对客户端统一替换为通用文案；4xx 的 message 是面向用户的业务提示，原样透传
  const message = appError.statusCode >= 500 ? '服务器内部错误，请稍后重试' : appError.message;

  // 有 details 时透传字段级错误，供前端做表单级提示
  return NextResponse.json(
    {
      code: appError.statusCode,
      data: null,
      message,
      ...(appError.statusCode < 500 && appError.details ? { details: appError.details } : {}),
    },
    { status: appError.statusCode },
  );
}
