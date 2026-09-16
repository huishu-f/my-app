/**
 * @file token.service.ts
 * @description JWT token 服务工厂：提供 token 的签发（generate）、校验（verify）、
 *              解码（decode）。verify 失败不抛异常，而是返回带 errorType 标记的结果对象，
 *              便于调用方区分「过期」与「无效」两种失败。仅限服务端（server-only）。
 */

import 'server-only';
import jwt from 'jsonwebtoken';
import { env } from '@server/config/env';
import type { AuthPayload, TokenVerifyResult, TokenService } from '@my-app/shared';

export type { AuthPayload };
export type { TokenVerifyResult, TokenService };

/**
 * 创建 token 服务
 * @returns 实现 TokenService 的对象，包含 generate/verify/decode 三个方法
 * @example
 * const svc = createTokenService();
 * const token = svc.generate({ id, email, tokenVersion: 0 });
 * const result = svc.verify(token);
 */
export function createTokenService(): TokenService {
  return {
    /**
     * 签发 JWT
     * @param payload 认证载荷（id、email、tokenVersion）
     * @returns 签名后的 JWT 字符串，过期时长取 env.JWT_EXPIRES_IN
     */
    generate: (payload: AuthPayload) => {
      const expiresIn = env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']; // token 过期时长，取自 env.JWT_EXPIRES_IN
      return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
    },
    /**
     * 校验 token 的签名与有效期
     * @param token JWT 字符串
     * @returns 成功返回 { success: true, payload }；过期返回 errorType 'expired'，
     *          其余无效情况（签名错误、格式错误等）返回 errorType 'invalid'
     */
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
    /**
     * 解码 token 载荷
     * @param token JWT 字符串
     * @returns 载荷对象，解码失败返回 null
     * @warning 不校验签名与有效期，仅用于刷新场景读取过期 token 的内容
     */
    decode: (token: string): AuthPayload | null => {
      try {
        return jwt.decode(token) as AuthPayload;
      } catch {
        return null;
      }
    },
  };
}
