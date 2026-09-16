/**
 * @file API 统一响应封装
 * @description 定义 API 的统一 JSON 响应结构（{ code, data, message }），
 *              提供成功/创建/错误响应的快捷构造与公开接口的 CDN 缓存头生成。
 *              引入 'server-only' 保证仅服务端路由层使用。
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { AppError, InternalServerError } from '@server/errors';
import { logger } from '@server/utils/logger';

/**
 * 发送统一成功响应
 * @param data 响应数据，放入 body.data
 * @param message 提示信息，默认 '操作成功'
 * @param status HTTP 状态码，默认 200
 * @param init 附加配置，可传入自定义响应头（如 CDN 缓存头）
 * @returns NextResponse JSON 响应，body 为 { code: 0, data, message }
 * @example
 * return sendSuccess(list); // 200 { code: 0, data: list, message: '操作成功' }
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
 * 生成公开只读接口的 CDN 缓存头
 * @description SWR 策略：s-maxage 秒内 CDN 直接命中返回；过期后 30s 内先返回旧响应、后台再刷新。
 *              仅适用于无个性化内容（不依赖 Cookie/登录态）的公开响应，
 *              s-maxage 应与后端 fetch Data Cache 的 revalidate 值对齐。
 * @param sMaxAge CDN 缓存秒数
 * @returns 含 Cache-Control 的响应头对象
 * @example
 * publicCacheHeaders(60) // => { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' }
 */
export function publicCacheHeaders(sMaxAge: number): Record<string, string> {
  return { 'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=30` };
}

/**
 * 发送创建成功响应
 * @description sendSuccess 的 201 语义化快捷方式
 * @param data 响应数据
 * @param message 提示信息，默认 '创建成功'
 * @returns NextResponse JSON 响应，HTTP 状态码 201
 */
export function sendCreated<T>(data: T, message = '创建成功'): NextResponse {
  return sendSuccess(data, message, 201);
}

/**
 * 发送统一错误响应
 * @description 将任意异常转为统一错误格式：AppError 直接使用其状态码/错误码/详情；
 *              非 AppError 包装为 InternalServerError。同时按严重级别写日志：
 *              5xx 走 error 级（附调用栈），4xx 走 warn 级。
 *              前端依据 HTTP status code 判断错误类型，body.message 提供文案。
 * @param err 任意异常或抛出的值
 * @returns 统一格式的 NextResponse JSON，body 为 { code: statusCode, data: null, message, details? }
 * @example
 * try { ... } catch (err) { return sendError(err); }
 */
export function sendError(err: unknown): NextResponse {
  // Turbopack 会把服务端代码拆成多个 chunk，跨 chunk 的 instanceof AppError
  // 因类引用不同而失败，改用鸭子类型（同时具有 number 型 statusCode 与 string 型 code）判断，
  // 兼容多 chunk 打包场景
  const isAppError =
    err !== null &&
    typeof err === 'object' &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (err as { code?: unknown }).code === 'string';
  const appError = isAppError
    ? (err as AppError)
    : new InternalServerError(err instanceof Error ? err.message : 'Internal server error');

  // 5xx 记录 error（含堆栈），4xx 记录 warn
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
