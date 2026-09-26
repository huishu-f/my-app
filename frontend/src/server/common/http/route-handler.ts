import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { sendError } from "./api-response";
import { requireAuth, tryAuth, type AuthDeps } from "@server/auth/auth.service";
import type { AuthPayload } from "@my-app/shared";
import { isRateLimited, getClientIp } from "@server/common/rate-limit";
import { RateLimitError, NotFoundError } from "@server/common/errors";
import { tokenService } from "@/server/auth/token.service";
import { findUserById } from "@server/user/user.repository";

interface RouteContext<P = Record<string, never>> {
  request: NextRequest;

  params: P;

  auth: AuthPayload | null;
}

interface RouteOptions {
  auth?: "required" | "optional" | "none";

  rateLimit?: {
    key: string;

    limit: number;

    windowMs: number;

    message?: string;
  };
}

export function defineRoute<P = Record<string, never>>(
  handler: (ctx: RouteContext<P>) => Promise<NextResponse>,
  options?: RouteOptions,
) {
  return async (request: NextRequest, context?: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      let auth: AuthPayload | null = null;
      if (options?.auth === "required") {
        const deps: AuthDeps = { tokenService, findUserById };
        auth = await requireAuth(request, deps);
      } else if (options?.auth === "optional") {
        const deps: AuthDeps = { tokenService, findUserById };
        auth = await tryAuth(request, deps);
      }

      if (options?.rateLimit) {
        const ip = getClientIp(request);
        if (
          await isRateLimited(
            `${options.rateLimit.key}:${ip}`,
            options.rateLimit.limit,
            options.rateLimit.windowMs,
          )
        ) {
          throw new RateLimitError(
            options.rateLimit.message ?? "Too many requests, please try again later",
          );
        }
      }

      const params = (context?.params ? await context.params : {}) as P;

      return await handler({ request, params, auth });
    } catch (err) {
      return sendError(err);
    }
  };
}

export function requireId(params: { id?: string }, label = "Post not found"): string {
  const id = params.id?.trim();
  if (!id) throw new NotFoundError(label);
  return id;
}
