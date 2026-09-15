/**
 * @file env.ts
 * @description 服务端环境变量读取与统一封装，供服务端各模块加载；缺失或非法时直接抛错
 */
import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * 读取环境变量字符串值
 * @param key 环境变量名
 * @param fallback 默认值，变量缺失或为空时使用；不传则抛错
 * @returns 环境变量值
 * @throws 变量缺失或为空且未提供默认值时抛出 Error
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
 * 读取环境变量并解析为整数
 * @param key 环境变量名
 * @param fallback 默认值，变量缺失或为空时使用
 * @returns 解析后的整数值
 * @throws 变量值无法解析为整数时抛出 Error
 */
function getInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${key} must be a valid integer`);
  return parsed;
}

/** 当前运行环境，默认 'development' */
const NODE_ENV = getEnv('NODE_ENV', 'development');

/**
 * JWT 签名密钥
 * 生产环境必须配置，开发环境未配置时回退为随机值
 */
const JWT_SECRET = getEnv(
  'JWT_SECRET',
  NODE_ENV === 'production'
    ? undefined // 生产环境未配置时抛错，避免 serverless 冷启动密钥不一致
    : randomBytes(32).toString('hex'),
);

/**
 * 环境变量统一出口
 */
export const env = {
  /** 当前运行环境 */
  NODE_ENV,
  /** 是否为开发环境 */
  isDev: NODE_ENV === 'development',
  /** 是否为生产环境 */
  isProd: NODE_ENV === 'production',
  /** JWT 签名密钥 */
  JWT_SECRET,
  /** JWT 过期时长，默认 '7d' */
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
  /** 密码哈希盐轮数，默认 10 */
  BCRYPT_SALT_ROUNDS: getInt('BCRYPT_SALT_ROUNDS', 10),
  /** Cookie 有效期，单位秒，默认 604800（7 天） */
  COOKIE_MAX_AGE: getInt('COOKIE_MAX_AGE', 7 * 24 * 60 * 60),
} as const;
