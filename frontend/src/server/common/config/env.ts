import "server-only";
import { randomBytes } from "node:crypto";

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${key} must be a valid integer`);
  return parsed;
}

const NODE_ENV = getEnv("NODE_ENV", "development");

const JWT_SECRET = getEnv(
  "JWT_SECRET",
  NODE_ENV === "production" ? undefined : randomBytes(32).toString("hex"),
);

if (NODE_ENV === "production" && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

const DATABASE_URL = getEnv("DATABASE_URL");

export const env = {
  NODE_ENV,

  isProd: NODE_ENV === "production",

  JWT_SECRET,

  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "7d"),

  // ponytail: 宽限期 = 过期后仍可换发新 token 的时长，等价于「会话可续期的最大间隔」。
  // 默认 7 天时，只要用户 7 天内回过一次站点就能一直续期，会话实际永不失效。
  // 压到 1 小时后被盗 token 的可用窗口从无限期变成小时级；如需更长会话请显式配置该变量。
  JWT_REFRESH_GRACE_SECONDS: getInt("JWT_REFRESH_GRACE_SECONDS", 60 * 60),

  BCRYPT_SALT_ROUNDS: getInt("BCRYPT_SALT_ROUNDS", 10),

  COOKIE_MAX_AGE: getInt("COOKIE_MAX_AGE", 7 * 24 * 60 * 60),

  DATABASE_URL,
} as const;
