/**
 * @file password.service.ts
 * @description 基于 bcryptjs 的密码哈希与比对服务；仅服务端可用
 */
import 'server-only';
import bcrypt from 'bcryptjs';
import { env } from '@server/config/env';
import type { PasswordService } from '@my-app/shared';

/** 复用 shared 中的密码服务接口类型 */
export type { PasswordService };

/**
 * 创建密码服务实例
 * @returns 含 hash（生成哈希）与 compare（校验比对）两个方法的 PasswordService
 */
export function createPasswordService(): PasswordService {
  return {
    // BCRYPT_SALT_ROUNDS 为加密代价因子（指数级，默认 10），越大越慢越安全
    hash: async (password: string) => bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
    compare: async (password: string, hash: string) => bcrypt.compare(password, hash),
  };
}
