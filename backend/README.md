# @my-app/backend — 框架无关的后端业务内核

这个目录是**可以直接复制进 Express / Koa / Fastify 项目使用**的后端业务代码。
它不 import 任何 `next`、`server-only`、`@/` 别名——所有内部引用都是相对路径，
唯一的包外依赖是 `@my-app/shared`（纯类型 + 纯函数，无运行时依赖）。

```
backend/
├── index.ts                  # 唯一公开出口，宿主只从这里 import
├── container.ts              # 依赖容器：装配并缓存全部仓储 / 服务
├── runtime.ts                # 宿主能力注册表（见下方「接缝 3」）
├── package.json              # 声明本目录运行所需的全部依赖
├── tsconfig.json             # 可独立 typecheck（不依赖仓库其它配置）
├── config/env.ts             # 环境变量读取与校验
├── errors/                   # 领域错误（AppError 及子类）
├── infrastructure/           # KV 抽象：kv-mock（本地）/ kv-store / kv-repository
├── utils/                    # common / logger / rate-limit / zod
└── modules/
    ├── auth/                 # 用户仓储、密码、Token、登录态守卫、Cookie 助手
    ├── blog/                 # 文章仓储、业务服务、Markdown 渲染、摘要
    └── comment/              # 评论仓储与业务服务
```

## 服务能力一览

| 容器成员 | 方法 |
| --- | --- |
| `authService` | `register` `login` `getMe` `logout` `changePassword` `updateProfile` `refresh` |
| `blogService` | `listPosts` `getPost` `incrementView` `createPost` `updatePost` `deletePost` `likePost` `toggleFavorite` `listFavoritePosts` `getCategories` `getTags` `getConfig` `updateConfig` `getNeighborPosts` |
| `commentService` | `listComments` `createComment` `updateComment` `deleteComment` `deleteCommentsByPostId` |

## 三个宿主接缝

抽取时刻意把「只有框架能做的事」收敛成 3 个接口。**换框架时只需要重写这 3 处 + 一个错误映射函数，业务代码一行都不用动。**

**接缝 1 — 读 Cookie**：`AuthDeps` / `CookieReadable`（`modules/auth/auth-guard.ts`）
只要求对象具备 `cookies.get(name)`。Next 的 `NextRequest` 原生满足。

**接缝 2 — 写 Cookie**：`CookieWritable`（`modules/auth/auth-cookie-helper.ts`）
只要求对象具备 `cookies.set(name, value, options)`。

**接缝 3 — 响应后执行**：`RuntimeAdapter`（`runtime.ts`）
`blogService.incrementView` 需要「响应已返回之后」再落库。Next serverless 会在响应后冻结实例，
因此必须用 `next/server` 的 `after`；Express 这类长驻进程没有这个问题，**不注入即可**（服务层自动退化为 fire-and-forget）。

## 环境变量

| 变量 | 必填 | 默认 |
| --- | --- | --- |
| `JWT_SECRET` | 生产必填 | 非生产随机生成（重启即失效） |
| `JWT_EXPIRES_IN` | 否 | `7d` |
| `JWT_REFRESH_GRACE_SECONDS` | 否 | `604800`（7 天） |
| `BCRYPT_SALT_ROUNDS` | 否 | `10` |
| `COOKIE_MAX_AGE` | 否 | `604800` |
| `NODE_ENV` | 否 | `development` |

KV 相关配置见 `infrastructure/kv-mock.ts`（本地模式）与 `kv-store.ts`。

## 迁移到 Express

复制 `backend/` 与 `shared/` 两个目录到 Express 项目，然后把 `backend/package.json` 里的
`"@my-app/shared": "workspace:*"` 改成 `"file:../shared"`，执行 `npm install`。

```ts
import express from 'express';
import { getContainer, tryAuth, isRateLimited, getClientIp, isAppError, InternalServerError, parseListQuery } from './backend';
import type { CookieReadable, CookieWritable } from './backend';

const app = express();
app.use(express.json());
const container = getContainer();          // 全局单例，进程内复用

/** 错误 → HTTP（对应 Next 侧的 server/utils/api-response.ts） */
const sendError = (res: express.Response, err: unknown) => {
  const e = isAppError(err) ? err : new InternalServerError(err instanceof Error ? err.message : 'Internal server error');
  res.status(e.statusCode).json({
    code: e.statusCode,
    data: null,
    message: e.statusCode >= 500 ? '服务器内部错误，请稍后重试' : e.message,
    ...(e.statusCode < 500 && e.details ? { details: e.details } : {}),
  });
};

/** 接缝 1：读 Cookie */
const readable = (req: express.Request): CookieReadable => ({
  cookies: { get: (n) => (req.cookies?.[n] === undefined ? undefined : { value: req.cookies[n] }) },
});
/** 接缝 2：写 Cookie */
const writable = (res: express.Response): CookieWritable => ({
  cookies: { set: (n, v, o) => res.cookie(n, v, o) },
});
/** 接缝 3：Express 长驻进程无需注入；若要严格「响应后执行」可自行实现 */
// configureRuntime({ scheduleAfterResponse: (task) => res.on('finish', () => void task()) });

app.post('/api/auth/login', async (req, res) => {
  try {
    const dto = parseLoginBody(req.body);
    if (await isRateLimited(`login:${getClientIp(req)}`, 10, 60_000)) {
      return res.status(429).json({ code: 429, data: null, message: '请求过于频繁，请稍后再试' });
    }
    const { user, token } = await container.authService.login(dto);
    container.authCookieHelper.setAuthCookies(writable(res), user);
    res.json({ code: 0, data: { user, token }, message: '登录成功' });
  } catch (e) {
    sendError(res, e);
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const auth = await tryAuth(readable(req), {
      tokenService: container.tokenService,
      userRepo: container.userRepo,
    });
    const data = await container.blogService.listPosts(parseListQuery(req.query as never), auth);
    res.json({ code: 0, data, message: '操作成功' });
  } catch (e) {
    sendError(res, e);
  }
});
```

## 开发期约定

- 本目录在仓库内以 `@my-app/backend` 工作区包的形式被 `frontend` 引用；
  前端通过 `@my-app/backend/...` 引子路径，不存在指向项目根之外的 tsconfig 别名。
- 本目录可以独立类型检查：`pnpm --filter @my-app/backend typecheck`。
