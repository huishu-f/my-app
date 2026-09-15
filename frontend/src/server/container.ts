/**
 * @file container.ts
 * @description 服务端依赖容器，集中组装并缓存仓储与服务实例，避免冷启动重复创建；仅服务端使用
 */
import 'server-only';
import { KVUserRepository } from '@server/modules/auth/kv-user.repository';
import { KVBlogRepository } from '@server/modules/blog/kv-blog.repository';
import { KVCommentRepository } from '@server/modules/comment/kv-comment.repository';
import { createPasswordService } from '@server/modules/auth/services/password.service';
import { createTokenService } from '@server/modules/auth/services/token.service';
import { createAuthService, toSafeUser } from '@server/modules/auth/services/auth.service';
import { createBlogService } from '@server/modules/blog/services/blog.service';
import { createCommentService } from '@server/modules/comment/services/comment.service';
import { createAuthCookieHelper } from '@server/modules/auth/auth-cookie.helper';

/**
 * 服务端依赖容器
 */
export interface Container {
  /** 用户仓储 */
  userRepo: KVUserRepository;
  /** 博客仓储 */
  blogRepo: KVBlogRepository;
  /** 评论仓储 */
  commentRepo: KVCommentRepository;
  /** 密码哈希与校验服务 */
  passwordService: ReturnType<typeof createPasswordService>;
  /** JWT Token 签发与校验服务 */
  tokenService: ReturnType<typeof createTokenService>;
  /** 认证服务 */
  authService: ReturnType<typeof createAuthService>;
  /** 博客业务服务 */
  blogService: ReturnType<typeof createBlogService>;
  /** 评论业务服务 */
  commentService: ReturnType<typeof createCommentService>;
  /** 认证 Cookie 读写辅助 */
  authCookieHelper: ReturnType<typeof createAuthCookieHelper>;
}

// 挂到 globalThis，避免 serverless 冷启动时模块缓存丢失导致重复创建实例
// ponytail: 单实例全局容器，多实例部署时每个实例独立初始化，无跨实例共享。
const globalForContainer = globalThis as unknown as { __appContainer?: Container };

/**
 * 获取依赖容器，首次调用时组装并缓存到 globalThis
 * @returns 依赖容器实例
 */
export function getContainer(): Container {
  if (globalForContainer.__appContainer) return globalForContainer.__appContainer;

  const userRepo = new KVUserRepository();
  const blogRepo = new KVBlogRepository();
  const commentRepo = new KVCommentRepository();

  const passwordService = createPasswordService();
  const tokenService = createTokenService();

  const authService = createAuthService({
    userRepo,
    passwordService,
    commentRepo,
    blogRepo,
  });

  const blogService = createBlogService({
    repo: blogRepo,
    userRepo,
    commentRepo,
  });

  const commentService = createCommentService({
    commentRepo,
    blogRepo,
    userRepo,
  });

  const authCookieHelper = createAuthCookieHelper({ tokenService });

  globalForContainer.__appContainer = {
    userRepo,
    blogRepo,
    commentRepo,
    passwordService,
    tokenService,
    authService,
    blogService,
    commentService,
    authCookieHelper,
  };

  return globalForContainer.__appContainer;
}

export { toSafeUser };
