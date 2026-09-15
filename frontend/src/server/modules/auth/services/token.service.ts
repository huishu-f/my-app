/**
 * @file token.service.ts
 * @description JWT token 服务工厂：签发、验证、解码 token，验证失败返回错误类型标记而非抛异常
 */

import 'server-only';
import jwt from 'jsonwebtoken';
import { env } from '@server/config/env';
import type { AuthPayload, TokenVerifyResult, TokenService } from '@my-app/shared';

export type { AuthPayload };
export type { TokenVerifyResult, TokenService };

/**
 * 创建 token 服务
 * @returns 包含 generate/verify/decode 的 TokenService；generate 过期时长取 env.JWT_EXPIRES_IN（默认 7d）
 */
export function createTokenService(): TokenService {
  return {
    /** 签发 JWT，payload 为认证载荷，过期时长取 env.JWT_EXPIRES_IN */
    generate: (payload: AuthPayload) => {
      const expiresIn = env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']; // token 过期时长，取自 env.JWT_EXPIRES_IN
      return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
    },
    /** 校验 token 签名与有效期：过期返回 expired，其余无效情况返回 invalid */
    verify: (token: string): TokenVerifyResult => {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        return { success: true, payload };
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return { success: false, errorType: 'expired' };
        }
        return { success: false, errorType: 'invalid' };
      }
    },
    /** 解码 token 载荷，不校验签名与有效期，解码失败返回 null */
    decode: (token: string): AuthPayload | null => {
      try {
        return jwt.decode(token) as AuthPayload;
      } catch {
        return null;
      }
    },
  };
}
