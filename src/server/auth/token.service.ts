import "server-only";
import jwt from "jsonwebtoken";
import { env } from "@server/common/config/env";
import type { AuthPayload, TokenVerifyResult, TokenService } from "@shared";

export type { AuthPayload };
export type { TokenVerifyResult, TokenService };

// ponytail: 钉死签名算法与 iss/aud，避免依赖 jsonwebtoken 的默认算法集合。

const ALGORITHM = "HS256" as const;
const ISSUER = "my-app";
const AUDIENCE = "my-app-web";

export const tokenService: TokenService = {
  generate: (payload) => {
    const expiresIn = env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"];
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn,
      algorithm: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  },
  verify: (token) => {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE,
      }) as AuthPayload;
      return { success: true, payload };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return { success: false, errorType: "expired" };
      }
      return { success: false, errorType: "invalid" };
    }
  },
  decode: (token) => jwt.decode(token) as AuthPayload | null,
};
