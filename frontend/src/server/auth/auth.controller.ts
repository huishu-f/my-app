"use server";

// ponytail: 本文件是 Server Actions 模块，不是 HTTP controller —— 不接 Request、
// 不解析响应、不设状态码。真正的 Route Handler 包装器叫 defineRoute。

import { cookies } from "next/headers";
import {
  toSafeUser,
  login,
  register,
  logout,
  changePassword,
  updateProfile,
  getMe,
  getAuthPayload,
} from "@server/auth/auth.service";
import { setAuthCookiesToJar, clearAuthCookiesFromJar } from "@server/auth/auth.cookie";
import {
  parseLoginBody,
  parseRegisterBody,
  parseChangePasswordBody,
  parseUpdateProfileBody,
} from "@server/auth/auth.validator";
import { isRateLimited } from "@server/common/rate-limit";
import { UnauthorizedError, RateLimitError } from "@server/common/errors";
import { toFailure, clientIp, type ActionResult } from "@server/common/action-result";
import type {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  UpdateProfileDto,
  SafeUser,
} from "@my-app/shared";

const LOGIN_WINDOW_MS = 5 * 60_000;

export async function loginAction(input: LoginDto): Promise<ActionResult<{ user: SafeUser }>> {
  if (await isRateLimited(`login:${await clientIp()}`, 5, LOGIN_WINDOW_MS)) {
    return toFailure(
      new RateLimitError("Too many attempts, please try again in 5 minutes"),
      "Auth",
    );
  }

  try {
    const dto = parseLoginBody(input);

    // ponytail: 账号维度独立计数。只按 IP 限流时，攻击者轮换 IP 即可对同一账号无限撞库；
    // 而共享出口（公司/校园网）的正常用户会互相挤掉那 5 次配额。
    if (await isRateLimited(`login:acct:${dto.email.toLowerCase()}`, 10, LOGIN_WINDOW_MS)) {
      return toFailure(
        new RateLimitError("Too many attempts, please try again in 5 minutes"),
        "Auth",
      );
    }

    const user = await login(dto);
    const jar = await cookies();
    setAuthCookiesToJar(jar, user);
    return { ok: true, data: { user: toSafeUser(user) } };
  } catch (err) {
    return toFailure(err, "Auth");
  }
}

export async function registerAction(
  input: RegisterDto,
): Promise<ActionResult<{ user: SafeUser }>> {
  if (await isRateLimited(`register:${await clientIp()}`, 5, LOGIN_WINDOW_MS)) {
    return toFailure(
      new RateLimitError("Registration too frequent, please try again in 5 minutes"),
      "Auth",
    );
  }

  try {
    const dto = parseRegisterBody(input);

    if (await isRateLimited(`register:acct:${dto.email.toLowerCase()}`, 5, LOGIN_WINDOW_MS)) {
      return toFailure(
        new RateLimitError("Registration too frequent, please try again in 5 minutes"),
        "Auth",
      );
    }

    const user = await register(dto);
    return { ok: true, data: { user: toSafeUser(user) } };
  } catch (err) {
    return toFailure(err, "Auth");
  }
}

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    const payload = await getAuthPayload();
    if (payload) {
      await logout(payload.id);
    }
    const jar = await cookies();
    clearAuthCookiesFromJar(jar);
    return { ok: true, data: null };
  } catch (err) {
    return toFailure(err, "Auth");
  }
}

export async function changePasswordAction(input: ChangePasswordDto): Promise<ActionResult<null>> {
  try {
    const payload = await getAuthPayload();
    if (!payload) throw new UnauthorizedError();

    const dto = parseChangePasswordBody(input);
    await changePassword(payload.id, dto);

    const jar = await cookies();
    clearAuthCookiesFromJar(jar);

    return { ok: true, data: null };
  } catch (err) {
    return toFailure(err, "Auth");
  }
}

export async function updateProfileAction(
  input: UpdateProfileDto,
): Promise<ActionResult<{ user: SafeUser }>> {
  try {
    const payload = await getAuthPayload();
    if (!payload) throw new UnauthorizedError();

    const dto = parseUpdateProfileBody(input);
    const user = await updateProfile(payload.id, dto);
    return { ok: true, data: { user: toSafeUser(user) } };
  } catch (err) {
    return toFailure(err, "Auth");
  }
}

export async function getMeAction(): Promise<ActionResult<{ user: SafeUser }>> {
  try {
    const payload = await getAuthPayload();
    if (!payload) throw new UnauthorizedError();

    const user = await getMe(payload.id);
    return { ok: true, data: { user: toSafeUser(user) } };
  } catch (err) {
    return toFailure(err, "Auth");
  }
}
