/**
 * @file env.ts
 * @description 服务端环境变量集中读取与校验；缺失必填项时抛异常，非生产环境为 JWT 生成临时密钥
 */
import { randomBytes } from 'node:crypto';

/**
 * 读取字符串环境变量
 * @param fallback 缺省值；未传则视为必填项
 * @returns 环境变量值或 fallback
 * @throws 变量缺失/为空且未提供 fallback 时抛出 Error
 */
function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * 读取整数环境变量
 * @param fallback 变量缺失/为空时返回的默认整数
 * @returns 解析后的整数或 fallback
 * @throws 变量存在但无法解析为整数时抛出 Error
 */
function getInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${key} must be a valid integer`);
  return parsed;
}

const NODE_ENV = getEnv('NODE_ENV', 'development');

/** JWT 签名密钥：生产必填（缺失抛异常），非生产用随机 32 字节十六进制兜底，进程重启即失效仅供本地 */
const JWT_SECRET = getEnv(
  'JWT_SECRET',
  NODE_ENV === 'production' ? undefined : randomBytes(32).toString('hex'),
);

/** 服务端运行时配置聚合对象 */
export const env = {
  /** 当前运行环境标识 */
  NODE_ENV,

  /** 是否开发环境 */
  isDev: NODE_ENV === 'development',

  /** 是否生产环境 */
  isProd: NODE_ENV === 'production',

  /** JWT 签名密钥 */
  JWT_SECRET,

  /** JWT 有效期，字符串时长（默认 '7d'，即 7 天） */
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),

  /**
   * 允许用已过期 Token 刷新的时间窗口，单位秒。
   * Token 过期超过该窗口后 refresh 端点拒绝换发，必须重新登录——泄漏的过期 Token 无法永久续命。
   * 默认 7 天。
   */
  JWT_REFRESH_GRACE_SECONDS: getInt('JWT_REFRESH_GRACE_SECONDS', 7 * 24 * 60 * 60),

  /** bcrypt 加盐轮数（默认 10） */
  BCRYPT_SALT_ROUNDS: getInt('BCRYPT_SALT_ROUNDS', 10),

  /** 登录 Cookie 最大存活时间，单位秒（默认 7 天 = 7*24*60*60 秒） */
  COOKIE_MAX_AGE: getInt('COOKIE_MAX_AGE', 7 * 24 * 60 * 60),
} as const;
