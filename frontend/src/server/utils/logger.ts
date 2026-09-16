/**
 * @file 轻量级日志工具
 * @description 零依赖的结构化日志器：按级别阈值过滤输出；
 *              生产环境输出单行 JSON（便于日志采集），开发环境输出带 ANSI 颜色的可读格式。
 */

import { env } from '@server/config/env';
import type { LogLevel } from '@my-app/shared';

/**
 * 日志级别优先级映射
 * @description 数值越大优先级越高，输出阈值基于该映射比较
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  /** debug 级别，优先级最低 */
  debug: 0,
  /** info 级别 */
  info: 1,
  /** warn 级别 */
  warn: 2,
  /** error 级别，优先级最高 */
  error: 3,
};

/** 当前配置的日志输出阈值：生产环境为 'info'，其余环境为 'debug' */
const configuredLevel: LogLevel = env.isProd ? 'info' : 'debug';

/**
 * 判断指定日志级别是否达到输出阈值
 * @param level 待判断的日志级别
 * @returns 是否允许输出（级别优先级 ≥ 配置阈值）
 * @example
 * isEnabled('debug') // 生产环境 => false
 */
function isEnabled(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configuredLevel];
}

/**
 * 格式化当前时间为 ISO 8601 字符串
 * @returns UTC ISO 格式时间戳，如 '2026-01-01T00:00:00.000Z'
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 输出一条日志到控制台
 * @description 先按阈值过滤；生产环境输出 JSON.stringify 后的单行结构化日志，
 *              开发环境按级别着色输出 [时间] 级别 消息 + meta JSON
 * @param level 日志级别
 * @param message 日志消息
 * @param meta 附带的结构化元数据（如 { userId: '1' }），会合并进日志输出
 */
function output(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!isEnabled(level)) return;

  const payload = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  // 生产：单行 JSON，方便采集解析
  if (env.isProd) {
    console.log(JSON.stringify(payload));
    return;
  }

  // 开发：级别着色，meta 存在时附在行尾
  const color = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  }[level];
  const reset = '\x1b[0m';
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${payload.timestamp}] ${color}${payload.level}${reset} ${message}${metaStr}`);
}

/**
 * 日志工具对象
 * @description 对外唯一出口，提供 debug/info/warn/error 四级方法，均支持可选结构化 meta
 */
export const logger = {
  /** 输出 debug 级别日志，仅开发环境启用 */
  debug: (message: string, meta?: Record<string, unknown>) => output('debug', message, meta),
  /** 输出 info 级别日志 */
  info: (message: string, meta?: Record<string, unknown>) => output('info', message, meta),
  /** 输出 warn 级别日志 */
  warn: (message: string, meta?: Record<string, unknown>) => output('warn', message, meta),
  /** 输出 error 级别日志 */
  error: (message: string, meta?: Record<string, unknown>) => output('error', message, meta),
};
