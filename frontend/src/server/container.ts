/**
 * @file 服务端依赖容器
 * @description 手写的轻量 IoC 容器：集中组装仓储（KV）与服务层实例，并缓存到 globalThis，
 *              避免 serverless/dev 场景下模块重复加载导致实例重复创建。
 *              引入 'server-only' 保证仅服务端可用。路由层通过 getContainer() 获取全部依赖。
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
 * 依赖容器结构
 * @description 汇聚全部仓储与业务服务实例，路由 handler 通过它访问依赖而非自行 import
 */
export interface Container {
  /** 用户仓储，负责用户数据 CRUD 与种子初始化 */
  userRepo: KVUserRepository;
  /** 博客仓储，负责文章数据 CRUD 与种子初始化 */
  blogRepo: KVBlogRepository;
  /** 评论仓储，负责评论数据 CRUD 与种子初始化 */
  commentRepo: KVCommentRepository;
  /** 密码服务，提供 bcrypt 哈希与比对 */
  passwordService: ReturnType<typeof createPasswordService>;
  /** Token 服务，提供 JWT 签发与校验 */
  tokenService: ReturnType<typeof createTokenService>;
  /** 认证服务，提供注册/登录/账户删除等业务逻辑 */
  authService: ReturnType<typeof createAuthService>;
  /** 博客业务服务，提供文章/分类/标签的查询与写操作 */
  blogService: ReturnType<typeof createBlogService>;
  /** 评论业务服务，提供评论的创建、查询、删除（含级联） */
  commentService: ReturnType<typeof createCommentService>;
  /** 认证 Cookie 辅助，负责 token Cookie 的写入与清除 */
  authCookieHelper: ReturnType<typeof createAuthCookieHelper>;
}

// 借助 globalThis 做跨模块缓存：dev 热重载 / serverless 冷启动会重建模块作用域，
// 挂在全局对象上可保证同一进程内容器只初始化一次。
// ponytail: 单实例全局容器，多实例部署时各实例独立初始化，无跨实例共享。
const globalForContainer = globalThis as unknown as { __appContainer?: Container };

/**
 * 获取依赖容器单例
 * @description 首次调用时按依赖顺序组装仓储与服务并缓存；之后直接返回缓存实例。
 *              组装顺序：仓储 → 密码/Token 服务 → 认证/博客/评论服务（注入仓储）→ Cookie 辅助
 * @returns 依赖容器实例
 * @example
 * const { blogService } = getContainer();
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
