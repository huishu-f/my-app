/**
 * @file container.ts
 * @description 服务端依赖注入容器：惰性组装仓储/服务单例并挂载到 globalThis，供路由层共享
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
 * 应用依赖容器：聚合全部仓储与服务单例，作为路由层的统一依赖入口
 */
export interface Container {
  /** 用户仓储 */
  userRepo: KVUserRepository;

  /** 博客仓储 */
  blogRepo: KVBlogRepository;

  /** 评论仓储 */
  commentRepo: KVCommentRepository;

  /** 密码加密/校验服务 */
  passwordService: ReturnType<typeof createPasswordService>;

  /** Token 签发/校验服务 */
  tokenService: ReturnType<typeof createTokenService>;

  /** 认证业务服务 */
  authService: ReturnType<typeof createAuthService>;

  /** 博客业务服务 */
  blogService: ReturnType<typeof createBlogService>;

  /** 评论业务服务 */
  commentService: ReturnType<typeof createCommentService>;

  /** 登录态 Cookie 读写辅助 */
  authCookieHelper: ReturnType<typeof createAuthCookieHelper>;
}

/** 借用 globalThis 缓存容器，避免 Next.js 热更新时重复构建实例 */
const globalForContainer = globalThis as unknown as { __appContainer?: Container };

/**
 * 获取全局依赖容器单例
 * @returns 已装配好的 Container；首次调用时构建并缓存到 globalThis
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
