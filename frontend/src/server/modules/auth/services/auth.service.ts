/**
 * @file auth.service.ts
 * @description 鉴权业务编排：注册/登录/取自身/登出/改密/改资料/令牌刷新，聚合用户仓储与密码服务并联动评论、文章的用户信息同步；仅服务端可用
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

/** 从 shared 转导出本模块相关类型，方便调用方就近引用 */
export type { UpdateProfileDto };
export type { SafeUser };
export type { AuthService };

/**
 * 剥离用户敏感字段，得到可安全返回前端的结果
 * @param user 完整用户对象
 * @returns 去除 password、tokenVersion、disabled 后的 SafeUser
 */
export function toSafeUser(user: User): SafeUser {
  // 通过解构剔除敏感字段；void 用于消解未使用变量的 lint 告警
  const { password: _password, tokenVersion: _tokenVersion, disabled: _disabled, ...safe } = user;
  void _password;
  void _tokenVersion;
  void _disabled;
  return safe;
}

/**
 * 创建鉴权服务实例：注入用户/密码/评论/文章依赖，返回 AuthService 约定的方法集合
 * @param deps 依赖集合
 * @returns 实现 register/login/getMe/logout/changePassword/updateProfile/refresh 的 AuthService
 */
export function createAuthService(deps: {
  /** 用户仓储 */
  userRepo: UserRepository;
  /** 密码哈希与比对服务 */
  passwordService: PasswordService;
  /** 评论仓储，用于改资料后同步评论作者信息 */
  commentRepo: CommentRepository;
  /** 文章仓储，用于改资料后同步文章 authorName */
  blogRepo: BlogRepository;
}): AuthService {
  /**
   * 注册新用户：预查重快速失败 + create 内原子抢占唯一性最终兜底，密码哈希存储
   * @param dto 注册信息（email/password/firstName/lastName/username）
   * @returns 创建后的完整用户（含哈希密码，仅服务端持有）
   * @throws ConflictError 邮箱或用户名已存在
   */
  async function register(dto: RegisterDto): Promise<User> {
    // 预查重：绝大多数重复注册在这里快速失败（走索引，O(1)）
    const exists = await deps.userRepo.existsByEmailOrUsername(dto.email, dto.username);
    if (exists) {
      throw new ConflictError('邮箱或用户名已被使用');
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: generateId(),
      // 先展开 dto，后面的显式字段会覆盖同名项（如明文密码被下方哈希值覆盖）
      ...dto,
      // 存库前对密码做 bcrypt 哈希，不保存明文
      password: await deps.passwordService.hash(dto.password),
      avatar: '',
      coverImage: '',
      bio: '',
      location: '',
      website: '',
      joined: new Date().toISOString(),
      // 新用户默认角色 Writer；tokenVersion 从 0 起用于登出/改密时作废旧 token
      role: 'Writer',
      company: '',
      verified: false,
      disabled: false,
      tags: [],
      social: { twitter: '', github: '', linkedin: '' },
      stats: { articles: 0, likes: 0, views: 0 },
      tokenVersion: 0,
      likedArticles: [],
      favoritedArticles: [],
      appearance: { theme: 'system', fontSize: 'medium' },
      createdAt: now,
      updatedAt: now,
    };

    try {
      return await deps.userRepo.create(newUser);
    } catch (err) {
      // 并发注册窗口期撞车：create 内原子 sadd 抢占失败 → 统一转为 409
      if (err instanceof Error && err.message.startsWith('注册冲突')) {
        throw new ConflictError('邮箱或用户名已被使用');
      }
      throw err;
    }
  }

  /**
   * 登录校验：按邮箱查用户并比对密码，检查账号是否被禁用
   * @param dto 登录信息（email/password）
   * @returns 校验通过的完整用户
   * @throws UnauthorizedError 邮箱不存在或密码错误
   * @throws ForbiddenError 账号已被禁用
   */
  async function login(dto: LoginDto): Promise<User> {
    const user = await deps.userRepo.findByEmail(dto.email);
    // 用户不存在与密码错误共用同一提示，避免暴露邮箱是否注册；?? '' 兜底缺失哈希的异常数据
    if (!user || !(await deps.passwordService.compare(dto.password, user.password ?? ''))) {
      throw new UnauthorizedError('邮箱或密码错误');
    }
    if (user.disabled) {
      throw new ForbiddenError('账号已被禁用');
    }
    return user;
  }

  /**
   * 获取当前用户完整信息
   * @param userId 用户 ID
   * @returns 用户对象
   * @throws NotFoundError 用户不存在
   */
  async function getMe(userId: string): Promise<User> {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    return user;
  }

  /**
   * 登出：递增 tokenVersion 使该用户已签发的所有 token 立即失效
   * @param userId 用户 ID
   * @returns 无；用户不存在时静默跳过，不抛异常
   */
  async function logout(userId: string): Promise<void> {
    const user = await deps.userRepo.findById(userId);
    // tokenVersion+1 与旧 token 内的版本错配，鉴权即判为失效；Cookie 的清理由 auth-cookie.helper 负责
    if (user) {
      await deps.userRepo.update(user.id, {
        tokenVersion: (user.tokenVersion ?? 0) + 1,
      });
    }
  }

  /**
   * 修改密码：校验当前密码后写入新哈希，并递增 tokenVersion 强制所有设备重新登录
   * @param userId 用户 ID
   * @param dto 含 currentPassword/newPassword
   * @returns 无
   * @throws UnauthorizedError 当前密码错误或用户不存在
   */
  async function changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await deps.userRepo.findById(userId);
    // 校验当前密码；用户不存在或哈希缺失同样判为未授权
    if (!user || !(await deps.passwordService.compare(dto.currentPassword, user.password ?? ''))) {
      throw new UnauthorizedError('当前密码错误');
    }

    await deps.userRepo.update(user.id, {
      // 重设密码哈希，并 tokenVersion+1 使旧 token 全部作废（强制重新登录）
      password: await deps.passwordService.hash(dto.newPassword),
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    });
  }

  /**
   * 更新个人资料：仅覆盖传入字段，成功后尽力同步评论与文章中的作者展示信息
   * @param userId 用户 ID
   * @param dto 可选的资料字段（firstName/lastName/avatar/bio/location/website）
   * @returns 更新后的用户
   * @throws NotFoundError 用户不存在
   */
  async function updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 合并语义各异：firstName/lastName 空值回退原值；bio 仅未传时回退；
    // location/website 区分“未传(保留)”与“传空串(清空为 '')”
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

    // 展示名：姓名为空时回退用户名；空头像串归一为 undefined 表示“无头像”
    const newName = `${firstName} ${lastName}`.trim() || user.username;
    const newAvatar = avatar || undefined;
    // 尽力同步：评论作者信息更新失败仅记日志，不影响资料保存结果
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

    // 同样为尽力同步：用 updateWithRetry 批量刷新文章 authorName，失败仅记日志
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
   * 令牌刷新前的再校验：确认用户仍存在、tokenVersion 未变、账号未禁用，用于安全地续签
   * @param decoded 当前（尚未过期）token 的载荷
   * @returns 校验通过的完整用户，供上层签发新 token
   * @throws UnauthorizedError 用户不存在或 tokenVersion 已失效
   * @throws ForbiddenError 账号已被禁用
   */
  async function refresh(decoded: AuthPayload): Promise<User> {
    const user = await deps.userRepo.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    // 版本错配说明期间已登出/改密，需重新登录
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
