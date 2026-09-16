/**
 * @file password.service.ts
 * @description 密码服务工厂：基于 bcryptjs 提供密码哈希与比对能力，
 *              供注册、登录、修改密码流程复用。仅限服务端（server-only）。
 */

import 'server-only';
import bcrypt from 'bcryptjs';
import { env } from '@server/config/env';
import type { PasswordService } from '@my-app/shared';

export type { PasswordService };

/**
 * 创建密码服务
 * @returns 实现 PasswordService 的对象：hash 使用 bcrypt 加盐哈希（成本因子取 env.BCRYPT_SALT_ROUNDS），
 *          compare 用于明文与哈希的比对
 * @example
 * const svc = createPasswordService();
 * const hash = await svc.hash('secret');
 * await svc.compare('secret', hash); // true
 */
export function createPasswordService(): PasswordService {
  return {
    hash: async (password: string) => bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
    compare: async (password: string, hash: string) => bcrypt.compare(password, hash),
  };
}
