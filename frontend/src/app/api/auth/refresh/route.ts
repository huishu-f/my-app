import { NextResponse } from "next/server";
import { defineRoute } from "@server/common/http/route-handler";
import { toSafeUser, refresh } from "@server/auth/auth.service";
import { setAuthCookies } from "@server/auth/auth.cookie";
import { UnauthorizedError } from "@server/common/errors";
import { AUTH_TOKEN_COOKIE } from "@/lib/authConstants";
import { env } from "@server/common/config/env";
import { tokenService } from "@server/auth/token.service";
import { REFRESH_RATE_LIMIT } from "@/config/site";

export const POST = defineRoute(
  async ({ request }) => {
    const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
    if (!token) {
      throw new UnauthorizedError("No token, please log in again");
    }
    const result = tokenService.verify(token);
    if (!result.success && result.errorType !== "expired") {
      throw new UnauthorizedError("Invalid token, please log in again");
    }
    const payload = result.success ? result.payload : tokenService.decode(token);
    if (!payload) {
      throw new UnauthorizedError("Token cannot be parsed, please log in again");
    }

    if (!result.success && typeof payload.exp === "number") {
      const expiredAgo = Math.floor(Date.now() / 1000) - payload.exp;
      if (expiredAgo > env.JWT_REFRESH_GRACE_SECONDS) {
        throw new UnauthorizedError("Session expired, please log in again");
      }
    }

    const user = await refresh(payload);
    const response = NextResponse.json(
      { code: 0, data: { user: toSafeUser(user) }, message: "Token refreshed" },
      { status: 200 },
    );
    setAuthCookies(response, user);
    return response;
  },
  {
    rateLimit: {
      key: "auth:refresh",
      limit: REFRESH_RATE_LIMIT,
      windowMs: 60 * 1000,
      message: "Refresh too frequent, please try again later",
    },
  },
);
