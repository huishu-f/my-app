import "server-only";

import type { NextRequest } from "next/server";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  User,
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  UpdateProfileDto,
  SafeUser,
  AuthPayload,
} from "@my-app/shared";
import { randomUUID } from "node:crypto";
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@server/common/errors";
import { passwordService } from "./password.service";
import { logger } from "@server/common/logger";
import { tokenService, type TokenService } from "./token.service";
import { AUTH_TOKEN_COOKIE } from "@/lib/authConstants";
import {
  findUserById,
  findUserByEmail,
  existsByEmailOrUsername,
  createUser,
  updateUser,
  bumpTokenVersion,
  isUniqueConstraintError,
} from "@server/user/user.repository";
// 改名级联走各域暴露的 service 入口，auth 不直接穿透 comment/blog 的 repository。
import { syncCommentAuthorProfile } from "@server/comment/comment.service";
import { syncPostAuthorName } from "@server/blog/blog.service";

export type { UpdateProfileDto, SafeUser };

async function resolveAuthData(): Promise<{ payload: AuthPayload; user: User } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const result = tokenService.verify(token);
  if (!result.success) return null;

  const decoded = result.payload;
  // ponytail: 鉴权路径不需要 likedBy/favoritedBy —— 那两个关联表的结果集随用户活跃度
  // 线性增长，而这里是每个已登录请求的必经之路。需要点赞态的客户端走 getMe。
  const user = await findUserById(decoded.id).catch(() => undefined);
  if (!user) return null;
  if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) return null;
  if (user.disabled) return null;

  return { payload: decoded, user };
}

const resolveAuthDataCached = cache(resolveAuthData);

export const getAuthPayload = cache(async (): Promise<AuthPayload | null> => {
  const data = await resolveAuthDataCached();
  return data?.payload ?? null;
});

export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  try {
    const data = await resolveAuthDataCached();
    if (!data) return null;
    return toSafeUser(data.user);
  } catch {
    return null;
  }
});

export async function requireUserOrRedirect(locale: string, redirectTo: string): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=${encodeURIComponent(redirectTo)}&stale=1`);
  }
  return user;
}

export interface AuthDeps {
  tokenService: TokenService;
  findUserById: (id: string) => Promise<User | undefined>;
}

export async function requireAuth(request: NextRequest, deps: AuthDeps): Promise<AuthPayload> {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) {
    throw new UnauthorizedError("Unauthorized, please log in first");
  }

  const result = deps.tokenService.verify(token);
  if (!result.success) {
    const msg =
      result.errorType === "expired"
        ? "Login session has expired, please log in again"
        : "Token is invalid, please log in again";
    throw new UnauthorizedError(msg);
  }

  const decoded = result.payload;
  const user = await deps.findUserById(decoded.id).catch(() => undefined);
  if (!user) {
    throw new UnauthorizedError("User not found, please log in again");
  }
  if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) {
    throw new UnauthorizedError("Token has expired, please log in again");
  }
  if (user.disabled) {
    throw new ForbiddenError("Account has been disabled");
  }
  return decoded;
}

export async function tryAuth(request: NextRequest, deps: AuthDeps): Promise<AuthPayload | null> {
  try {
    return await requireAuth(request, deps);
  } catch {
    return null;
  }
}

export function toSafeUser(user: User): SafeUser {
  const { password: _p, tokenVersion: _t, disabled: _d, ...safe } = user;
  void _p;
  void _t;
  void _d;
  return safe;
}

export async function register(dto: RegisterDto): Promise<User> {
  const exists = await existsByEmailOrUsername(dto.email, dto.username);
  if (exists) {
    throw new ConflictError("Email or username already in use");
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: randomUUID(),
    ...dto,
    password: await passwordService.hash(dto.password),
    avatar: "",
    coverImage: "",
    bio: "",
    location: "",
    website: "",
    joined: new Date().toISOString(),
    role: "Writer",
    company: "",
    verified: false,
    disabled: false,
    tags: [],
    social: { twitter: "", github: "", linkedin: "" },
    stats: { articles: 0, likes: 0, views: 0 },
    tokenVersion: 0,
    likedArticles: [],
    favoritedArticles: [],
    appearance: { theme: "system", fontSize: "medium" },
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await createUser(newUser);
  } catch (err) {
    // ponytail: 「先查后写」本身是 TOCTOU —— 两个并发注册可以同时通过上面的 exists 检查。
    // 此前兜底比对的是一个自造前缀 "Registration conflict"，Prisma 永远不会抛出它，
    // 于是并发注册落到 500 而不是 409。现在直接判定唯一键冲突码 P2002。
    if (isUniqueConstraintError(err)) {
      throw new ConflictError("Email or username already in use");
    }
    throw err;
  }
}

export async function login(dto: LoginDto): Promise<User> {
  // 登录返回的 user 会直接交给客户端渲染点赞/收藏态，必须带关联。
  const user = await findUserByEmail(dto.email, { withAssociations: true });
  if (!user || !(await passwordService.compare(dto.password, user.password ?? ""))) {
    throw new UnauthorizedError("Email or password incorrect");
  }
  if (user.disabled) {
    throw new ForbiddenError("Account has been disabled");
  }
  return user;
}

export async function getMe(userId: string): Promise<User> {
  // 客户端需要一个含 likedArticles/favoritedArticles 的完整用户对象。
  const user = await findUserById(userId, { withAssociations: true });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

export async function logout(userId: string): Promise<void> {
  await bumpTokenVersion(userId);
}

export async function changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
  const user = await findUserById(userId);
  if (!user || !(await passwordService.compare(dto.currentPassword, user.password ?? ""))) {
    throw new UnauthorizedError("Current password incorrect");
  }
  await updateUser(userId, {
    password: await passwordService.hash(dto.newPassword),
  });
  await bumpTokenVersion(userId);
}

export async function updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const firstName = dto.firstName?.trim() || user.firstName;
  const lastName = dto.lastName?.trim() || user.lastName;
  const avatar = dto.avatar ?? user.avatar;
  const bio = dto.bio?.trim() ?? user.bio;
  const location = dto.location !== undefined ? dto.location.trim() || "" : user.location;
  const website = dto.website !== undefined ? dto.website.trim() || "" : user.website;

  const updated = await updateUser(userId, {
    firstName,
    lastName,
    avatar,
    bio,
    location,
    website,
  });
  if (!updated) {
    throw new NotFoundError("User not found");
  }

  const newName = `${firstName} ${lastName}`.trim() || user.username;
  const newAvatar = avatar || undefined;

  // Best-effort cascade: name/avatar sync is eventually-consistent,
  // failures are logged but don't roll back the profile update.
  try {
    const count = await syncCommentAuthorProfile(userId, newName, newAvatar ?? null);
    if (count > 0) {
      logger.info(`Synced ${count} comments with updated username/avatar`, { userId });
    }
  } catch (err) {
    logger.error("Failed to sync comment username", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await syncPostAuthorName(userId, newName);
    logger.info("Synced post authorName", { userId });
  } catch (err) {
    logger.error("Failed to sync post authorName", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return updated;
}

export async function refresh(decoded: AuthPayload): Promise<User> {
  const user = await findUserById(decoded.id, { withAssociations: true });
  if (!user) {
    throw new UnauthorizedError("User not found");
  }
  if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) {
    throw new UnauthorizedError("Token has expired, please log in again");
  }
  if (user.disabled) {
    throw new ForbiddenError("Account has been disabled");
  }
  return user;
}
