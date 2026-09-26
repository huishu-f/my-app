import "server-only";

import type { NextResponse } from "next/server";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { User } from "@my-app/shared";
import { tokenService } from "./token.service";
import { AUTH_TOKEN_COOKIE, AUTH_STATUS_COOKIE } from "@/lib/authConstants";
import { env } from "@server/common/config/env";

function cookieOptions(overrides: { httpOnly: boolean; maxAge?: number }) {
  return {
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: env.COOKIE_MAX_AGE,
    ...overrides,
  };
}

export function setAuthCookies(res: NextResponse, user: User): void {
  const token = tokenService.generate({
    id: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion ?? 0,
  });
  res.cookies.set(AUTH_TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));
  res.cookies.set(AUTH_STATUS_COOKIE, "1", cookieOptions({ httpOnly: false }));
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(AUTH_TOKEN_COOKIE, "", cookieOptions({ httpOnly: true, maxAge: 0 }));
  res.cookies.set(AUTH_STATUS_COOKIE, "", cookieOptions({ httpOnly: false, maxAge: 0 }));
}

export function setAuthCookiesToJar(jar: ReadonlyRequestCookies, user: User): void {
  const token = tokenService.generate({
    id: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion ?? 0,
  });
  jar.set(AUTH_TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));
  jar.set(AUTH_STATUS_COOKIE, "1", cookieOptions({ httpOnly: false }));
}

export function clearAuthCookiesFromJar(jar: ReadonlyRequestCookies): void {
  jar.set(AUTH_TOKEN_COOKIE, "", cookieOptions({ httpOnly: true, maxAge: 0 }));
  jar.set(AUTH_STATUS_COOKIE, "", cookieOptions({ httpOnly: false, maxAge: 0 }));
}
