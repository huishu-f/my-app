/**
 * @file 服务端环境变量配置
 * @description 集中读取并校验服务端环境变量，统一以 env 对象导出；
 *              引入 'server-only' 保证仅服务端模块可用，避免配置泄漏到客户端 bundle。
 *              必填变量缺失或格式非法时在模块加载阶段直接抛错，实现快速失败。
 */
import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * 读取字符串类型环境变量
 * @param key 环境变量名
 * @param fallback 兜底默认值；变量缺失或为空字符串时使用，未提供时视为必填
 * @returns 环境变量值或默认值
 * @throws 变量缺失或为空且未提供 fallback 时抛出 Error
 * @example
 * getEnv('NODE_ENV', 'development') // => 'development'
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
 * 读取并解析整数类型环境变量
 * @param key 环境变量名
 * @param fallback 兜底默认值；变量缺失或为空字符串时使用
 * @returns 解析后的十进制整数
 * @throws 变量值无法解析为整数时抛出 Error
 * @example
 * getInt('BCRYPT_SALT_ROUNDS', 10) // => 10
 */
function getInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${key} must be a valid integer`);
  return parsed;
}

/** 当前运行环境标识，未设置时默认 'development' */
const NODE_ENV = getEnv('NODE_ENV', 'development');

/**
 * JWT 签名密钥
 * 生产环境必须显式配置（缺失即抛错，避免 serverless 冷启动时随机密钥不一致导致 token 失效）；
 * 非生产环境未配置时回退为随机生成的 32 字节 hex 字符串
 */
const JWT_SECRET = getEnv(
  'JWT_SECRET',
  NODE_ENV === 'production'
    ? undefined
    : randomBytes(32).toString('hex'),
);

/**
 * 环境变量统一出口对象
 * @description 服务端各模块统一从这里读取配置，禁止直接访问 process.env
 */
export const env = {
  /** 当前运行环境，'development' | 'production' | 'test' */
  NODE_ENV,
  /** 是否为开发环境 */
  isDev: NODE_ENV === 'development',
  /** 是否为生产环境 */
  isProd: NODE_ENV === 'production',
  /** JWT 签名密钥 */
  JWT_SECRET,
  /** JWT 过期时长表达式，默认 '7d'（ms 库格式） */
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
  /** bcrypt 密码哈希盐轮数，默认 10 */
  BCRYPT_SALT_ROUNDS: getInt('BCRYPT_SALT_ROUNDS', 10),
  /** 认证 Cookie 有效期，单位秒，默认 604800（7 天） */
  COOKIE_MAX_AGE: getInt('COOKIE_MAX_AGE', 7 * 24 * 60 * 60),
} as const;
