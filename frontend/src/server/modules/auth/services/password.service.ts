/**
 * @file password.service.ts
 * @description 密码服务工厂：基于 bcryptjs 提供密码哈希与比对，供注册/登录/改密模块复用
 */

import 'server-only';
import bcrypt from 'bcryptjs';
import { env } from '@server/config/env';
import type { PasswordService } from '@my-app/shared';

export type { PasswordService };

/**
 * 创建密码服务
 * @returns 包含 hash/compare 的 PasswordService；hash 使用 bcrypt 加盐，成本因子取 env.BCRYPT_SALT_ROUNDS（默认 10）
 */
export function createPasswordService(): PasswordService {
  return {
    hash: async (password: string) => bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
    compare: async (password: string, hash: string) => bcrypt.compare(password, hash),
  };
}
