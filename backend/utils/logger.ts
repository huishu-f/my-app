/**
 * @file logger.ts
 * @description 轻量结构化日志：按环境决定最低级别，生产输出单行 JSON、开发输出带 ANSI 颜色的可读文本
 */
import { env } from '../config/env';
import type { LogLevel } from '@my-app/shared';

/** 日志级别优先级映射：数值越小越不重要，输出时按 >= 已配置级别过滤 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  /** 调试（rank 0） */
  debug: 0,

  /** 一般信息（rank 1） */
  info: 1,

  /** 告警（rank 2） */
  warn: 2,

  /** 错误（rank 3） */
  error: 3,
};

/** 当前生效的最低日志级别：生产仅 info 及以上，开发 debug 全量 */
const configuredLevel: LogLevel = env.isProd ? 'info' : 'debug';

/**
 * 判断某级别是否达到输出阈值
 * @returns 该级别优先级 >= 当前生效级别时为 true
 */
function isEnabled(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configuredLevel];
}

/**
 * 生成当前时间戳
 * @returns ISO 8601 格式的 UTC 时间字符串
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 输出一条日志：先按级别过滤，再根据环境选择 JSON 或带色文本格式
 * @param level 日志级别
 * @param message 日志正文
 * @param meta 附加结构化字段，会被并入输出
 */
function output(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!isEnabled(level)) return;

  const payload = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  // 生产：输出单行 JSON，便于日志采集器解析
  if (env.isProd) {
    console.log(JSON.stringify(payload));
    return;
  }

  // 开发：按级别用 ANSI 转义码着色（青/绿/黄/红），末尾 \x1b[0m 复位
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

/** 对外日志入口：按级别包装 output */
export const logger = {
  /** 调试级日志 */
  debug: (message: string, meta?: Record<string, unknown>) => output('debug', message, meta),

  /** 信息级日志 */
  info: (message: string, meta?: Record<string, unknown>) => output('info', message, meta),

  /** 告警级日志 */
  warn: (message: string, meta?: Record<string, unknown>) => output('warn', message, meta),

  /** 错误级日志 */
  error: (message: string, meta?: Record<string, unknown>) => output('error', message, meta),
};
