/**
 * @file token-service.ts
 * @description 基于 jsonwebtoken 的 JWT 签发/校验/解码服务；密钥与有效期取自 env；仅服务端可用
 */
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import type { AuthPayload, TokenVerifyResult, TokenService } from '@my-app/shared';

/** 复用 shared 中的令牌载荷类型 */
export type { AuthPayload };
/** 复用 shared 中的校验结果与服务接口类型 */
export type { TokenVerifyResult, TokenService };

/**
 * 创建令牌服务实例
 * @returns 含 generate（签发）/verify（验签）/decode（无验签解码）的 TokenService
 */
export function createTokenService(): TokenService {
  return {
    // 用 JWT_SECRET 对 payload 签名并附带有效期
    generate: (payload: AuthPayload) => {
      // env.JWT_EXPIRES_IN 是时长字符串（默认 '7d'，单位为天/小时等 jwt 语法），转成 sign 所需的 expiresIn 类型
      const expiresIn = env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'];
      return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
    },

    // 验签并解析；以返回结果对象表达失败原因，而非抛异常
    verify: (token: string): TokenVerifyResult => {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        return { success: true, payload };
      } catch (err) {
        // errorType 为哨兵值：过期 'expired'，其余（签名不符/格式错误等）统一 'invalid'
        if (err instanceof jwt.TokenExpiredError) {
          return { success: false, errorType: 'expired' };
        }
        return { success: false, errorType: 'invalid' };
      }
    },

    // 仅解码不验签：结果不可用于鉴权信任判断；解析失败返回 null 而非抛异常
    decode: (token: string): AuthPayload | null => {
      try {
        return jwt.decode(token) as AuthPayload;
      } catch {
        return null;
      }
    },
  };
}
