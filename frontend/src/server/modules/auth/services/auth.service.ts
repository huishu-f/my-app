/**
 * @file auth.service.ts
 * @description auth 模块核心业务服务工厂：提供注册、登录、获取当前用户、登出、
 *              修改密码、更新个人资料、刷新 Token 等用户账户操作，
 *              并在资料更新时同步评论/文章中的作者冗余信息。仅限服务端（server-only）。
 */

import 'server-only';

import type {
  User,
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  UpdateProfileDto,
  SafeUser,
  AuthService,
  AuthPayload,
} from '@my-app/shared';
import { generateId } from '@server/utils/common';
import { UnauthorizedError, NotFoundError, ConflictError, ForbiddenError } from '@server/errors';
import type { UserRepository } from '@server/modules/auth/kv-user.repository';
import type { CommentRepository } from '@server/modules/comment/kv-comment.repository';
import type { BlogRepository } from '@server/modules/blog/kv-blog.repository';
import type { PasswordService } from './password.service';
import { logger } from '@server/utils/logger';

export type { UpdateProfileDto };
export type { SafeUser };
export type { AuthService };

/**
 * 从 User 中剥离敏感字段
 * @description 移除 password、tokenVersion、disabled——这些字段不应暴露给前端
 * @param user 原始用户对象
 * @returns 不含敏感字段的安全用户对象 SafeUser
 * @example
 * toSafeUser(user)
 */
export function toSafeUser(user: User): SafeUser {
  const { password: _password, tokenVersion: _tokenVersion, disabled: _disabled, ...safe } = user;
  void _password;
  void _tokenVersion;
  void _disabled;
  return safe;
}

/**
 * 创建 auth 服务
 * @param deps 依赖对象，包含 userRepo（用户仓储）、passwordService（密码服务）、
 *             commentRepo（评论仓储，用于同步用户名/头像）、blogRepo（博客仓储，用于同步作者名）
 * @returns 实现 AuthService 接口的服务对象
 */
export function createAuthService(deps: {
  userRepo: UserRepository;
  passwordService: PasswordService;
  commentRepo: CommentRepository;
  blogRepo: BlogRepository;
}): AuthService {
  /**
   * 注册新用户
   * @param dto 注册参数（邮箱、密码、姓名、用户名）
   * @returns 创建成功的完整用户对象（含默认资料、统计与 tokenVersion=0）
   * @throws 邮箱或用户名已被占用时抛出 ConflictError
   */
  async function register(dto: RegisterDto): Promise<User> {
    const exists = await deps.userRepo.existsByEmailOrUsername(dto.email, dto.username);
    if (exists) {
      throw new ConflictError('邮箱或用户名已被使用');
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: generateId(),
      ...dto,
      password: await deps.passwordService.hash(dto.password),
      avatar: '',
      coverImage: '',
      bio: '',
      location: '',
      website: '',
      joined: new Date().toISOString(),
      role: 'Writer',
      company: '',
      verified: false,
      disabled: false,
      tags: [],
      social: { twitter: '', github: '', linkedin: '' },
      stats: { articles: 0, likes: 0, views: 0 },
      tokenVersion: 0, // 初始 tokenVersion 为 0，登出/改密时递增使旧 Token 失效
      likedArticles: [],
      favoritedArticles: [],
      appearance: { theme: 'system', fontSize: 'medium' },
      createdAt: now,
      updatedAt: now,
    };

    return deps.userRepo.create(newUser);
  }

  /**
   * 用户登录
   * @param dto 登录参数（邮箱、密码）
   * @returns 验证通过的用户对象
   * @throws 邮箱或密码错误时抛出 UnauthorizedError；账号被禁用时抛出 ForbiddenError
   */
  async function login(dto: LoginDto): Promise<User> {
    const user = await deps.userRepo.findByEmail(dto.email);
    if (!user || !(await deps.passwordService.compare(dto.password, user.password ?? ''))) {
      throw new UnauthorizedError('邮箱或密码错误');
    }
    if (user.disabled) {
      throw new ForbiddenError('账号已被禁用');
    }
    return user;
  }

  /**
   * 获取当前用户信息
   * @param userId 用户 ID
   * @returns 用户对象
   * @throws 用户不存在时抛出 NotFoundError
   */
  async function getMe(userId: string): Promise<User> {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    return user;
  }

  /**
   * 用户登出：递增 tokenVersion 使该用户已签发的全部 Token 失效
   * @description 用户不存在时静默忽略，不抛错
   * @param userId 用户 ID
   */
  async function logout(userId: string): Promise<void> {
    const user = await deps.userRepo.findById(userId);
    if (user) {
      await deps.userRepo.update(user.id, {
        tokenVersion: (user.tokenVersion ?? 0) + 1,
      });
    }
  }

  /**
   * 修改密码：校验当前密码后写入新密码哈希并递增 tokenVersion 强制重新登录
   * @param userId 用户 ID
   * @param dto 修改密码参数（当前密码、新密码）
   * @throws 当前密码错误时抛出 UnauthorizedError
   */
  async function changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await deps.userRepo.findById(userId);
    if (!user || !(await deps.passwordService.compare(dto.currentPassword, user.password ?? ''))) {
      throw new UnauthorizedError('当前密码错误');
    }

    await deps.userRepo.update(user.id, {
      password: await deps.passwordService.hash(dto.newPassword),
      tokenVersion: (user.tokenVersion ?? 0) + 1, // 递增 tokenVersion，强制重新登录
    });
  }

  /**
   * 更新用户资料，并同步评论与文章中的作者冗余信息
   * @description 各字段缺省时保留原值；写入成功后同步刷新评论的 userName/userAvatar
   *              与文章的 authorName，同步失败仅记日志不影响主流程
   * @param userId 用户 ID
   * @param dto 更新资料参数（姓名、头像、简介、位置、网站）
   * @returns 更新后的用户对象
   * @throws 用户不存在时抛出 NotFoundError
   */
  async function updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const firstName = dto.firstName?.trim() || user.firstName;
    const lastName = dto.lastName?.trim() || user.lastName;
    const avatar = dto.avatar ?? user.avatar;
    const bio = dto.bio?.trim() ?? user.bio;
    const location = dto.location !== undefined ? dto.location.trim() || '' : user.location;
    const website = dto.website !== undefined ? dto.website.trim() || '' : user.website;

    const updated = await deps.userRepo.update(userId, {
      firstName,
      lastName,
      avatar,
      bio,
      location,
      website,
    });
    if (!updated) {
      throw new NotFoundError('用户不存在');
    }

    // 同步更新评论中的 userName 和 userAvatar（关键数据一致性，必须 await）
    const newName = `${firstName} ${lastName}`.trim() || user.username;
    const newAvatar = avatar || undefined;
    try {
      const count = await deps.commentRepo.updateUserInfoByUserId(userId, newName, newAvatar);
      if (count > 0) {
        logger.info(`同步更新 ${count} 条评论的用户名/头像`, { userId });
      }
    } catch (err) {
      logger.error('同步评论用户名失败', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 同步更新文章中的 authorName（关键数据一致性）
    try {
      await deps.blogRepo.updateWithRetry((db) => {
        for (const post of db.posts) {
          if (post.authorId === userId) {
            post.authorName = newName;
          }
        }
      });
      logger.info('同步更新文章 authorName', { userId });
    } catch (err) {
      logger.error('同步文章 authorName 失败', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return updated;
  }

  /**
   * 刷新 Token：基于过期 Token 解码出的 payload 重新校验用户状态
   * @param decoded 从过期 Token 中解码出的认证载荷
   * @returns 校验通过的用户对象（供重新签发 Token）
   * @throws 用户不存在或 tokenVersion 不匹配时抛出 UnauthorizedError；账号被禁用时抛出 ForbiddenError
   */
  async function refresh(decoded: AuthPayload): Promise<User> {
    const user = await deps.userRepo.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }
    // 校验 tokenVersion：若用户已登出或改密，tokenVersion 递增后旧 Token 无法刷新
    if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) {
      throw new UnauthorizedError('Token 已失效，请重新登录');
    }
    if (user.disabled) {
      throw new ForbiddenError('账号已被禁用');
    }
    return user;
  }

  return { register, login, getMe, logout, changePassword, updateProfile, refresh };
}
