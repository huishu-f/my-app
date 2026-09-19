---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '695f1b48-f1da-4c40-9485-d264c63caf29'
  PropagateID: '695f1b48-f1da-4c40-9485-d264c63caf29'
  ReservedCode1: 'a1170738-30a5-4141-88c6-c24bd6695d1c'
  ReservedCode2: 'a1170738-30a5-4141-88c6-c24bd6695d1c'
---

# My App — 多作者中文技术写作平台

基于 Next.js 16 App Router 的全栈博客平台，支持多作者注册、Markdown 写作、点赞收藏、评论互动，采用 pnpm monorepo 结构。

## 技术栈

| 层级        | 技术                                  | 说明                                           |
| ----------- | ------------------------------------- | ---------------------------------------------- |
| 前端框架    | Next.js 16 + React 19                 | App Router，Server Components + Client Islands |
| 语言        | TypeScript 5.9 (strict)               | 全栈类型安全                                   |
| 样式        | Tailwind CSS v4                       | @theme token 系统，自定义组件库                |
| 状态管理    | React Context + 原生 hooks            | 登录态与页面展示态，无第三方状态库             |
| 主题        | next-themes                           | 明/暗主题切换                                  |
| Markdown    | marked + highlight.js + sanitize-html | 渲染 + 代码高亮 + XSS 防护                     |
| 认证        | JWT (httpOnly Cookie) + bcryptjs      | tokenVersion 机制支持登出/改密使旧 Token 失效  |
| 校验        | Zod 4                                 | 请求参数验证                                   |
| 数据存储    | KV 抽象层                             | 开发环境内存 Mock，生产环境 Upstash Redis      |
| 包管理      | pnpm workspace                        | monorepo（frontend + backend + shared）        |
| 部署        | Netlify                               | @netlify/plugin-nextjs                         |
| Lint/Format | ESLint 10 + Prettier 3                | 统一代码风格                                   |

## Monorepo 结构

```
my-app/
├── frontend/               # Next.js 应用（页面 / 数据访问 / 写操作 / 组件）
│   ├── src/
│   │   ├── app/             # App Router：只放路由约定文件（page/layout/route）
│   │   ├── actions/         # 写操作唯一入口（Server Actions）
│   │   ├── services/        # 按域的数据访问（RSC 取数 + 客户端 hooks）
│   │   ├── features/        # 领域组件（按业务域分目录）
│   │   ├── ui/              # 通用原子组件 + layout/
│   │   ├── providers/       # Context Provider 聚合（AppProviders / AuthProvider）
│   │   ├── hooks/           # 跨域通用 Hook（鉴权、滚动、可关闭浮层等）
│   │   ├── server/          # Next 宿主适配（route-handler / cache / runtime / 限流策略）
│   │   ├── lib/             # 工具层（同构请求层 request、格式化、消毒、提示浮层等）
│   │   ├── config/          # 站点与 i18n 配置
│   │   ├── i18n/            # next-intl 路由、请求配置、[locale] 参数解析与文案字典
│   │   ├── styles/          # 全局样式分层（tokens/base/typography/components）
│   │   └── proxy.ts         # Edge 中间件（路由守卫 + API 代理）
│   ├── next.config.ts
│   └── .env.example
├── backend/                # 可移植后端包 (@my-app/backend)
│   ├── container.ts        # DI 容器（挂 globalThis，冷启动后保活）
│   ├── runtime.ts          # 宿主能力注册表（Express 下替换 after 注入）
│   ├── modules/            # auth / blog / comment（service + repository + validators）
│   ├── infrastructure/     # KV 抽象与适配（kv-store / kv-repository / kv-mock）
│   ├── errors/             # 业务错误类型
│   ├── config/             # 环境变量解析
│   └── utils/              # rate-limit、logger、zod 等框架无关工具
├── shared/                 # 前后端共享类型包 (@my-app/shared)
│   └── types/
│       ├── common.ts       # ApiResponse<T>
│       ├── user.ts         # User, SafeUser, RegisterDto, LoginDto, ...
│       ├── blog.ts         # Post, CreatePostDto, PostListParams, ...
│       ├── comment.ts      # Comment, CreateCommentDto, ...
│       ├── ui.ts           # 组件 Props 类型
│       ├── backend/        # 服务接口定义
│       └── frontend/       # 前端专用类型
├── comment-template/       # 全站注释规范模板（ts / tsx / css / vue）
├── netlify.toml            # Netlify 部署配置
└── pnpm-workspace.yaml
```

### 命名规范（全仓一句话）

**React 组件文件用 PascalCase（`Button.tsx`），React Hook 文件用驼峰（`useFetch.ts`），其余一切 `.ts` 文件与全部目录一律 kebab-case（`auth-validators.ts`、`kv-user-repository.ts`），角色后缀用横线连接，不用点。**

### 行尾（全仓 LF）

全仓统一 **LF**：`.gitattributes` 声明 `* text=auto eol=lf`，与 `.prettierrc.mjs` 的 `endOfLine: 'lf'` 一致。
Windows 上如果 `git config core.autocrlf` 把这个约定盖掉（工作区被检出成 CRLF），`pnpm format:check` 会全仓报错——
那是行尾问题，不是代码风格问题，用 `pnpm exec prettier --list-different <glob>` 一看便知。

## 快速开始

### 环境要求

- Node.js >= 20（本地开发与 Netlify 部署均建议 22）
- pnpm >= 10（仓库锁定 packageManager 为 pnpm@12.4.1，corepack 会自动启用）

### 安装与运行

```bash
# 安装依赖
pnpm install

# 复制环境变量模板
cp frontend/.env.example frontend/.env.local

# 启动开发服务器（默认 http://localhost:3000）
pnpm dev
```

### 环境变量

| 变量                                              | 必填     | 默认值         | 说明                       |
| ------------------------------------------------- | -------- | -------------- | -------------------------- |
| `JWT_SECRET`                                      | 生产环境 | 随机生成       | JWT 签名密钥（>= 32 字符） |
| `NEXT_PUBLIC_BASE_URL`                            | 是       | —              | 站点 URL（SEO 用）         |
| `KV_URL` 或 `UPSTASH_REDIS_REST_URL`              | 生产环境 | —              | Upstash Redis 连接地址     |
| `KV_REST_API_TOKEN` 或 `UPSTASH_REDIS_REST_TOKEN` | 生产环境 | —              | Upstash Redis Token        |
| `JWT_EXPIRES_IN`                                  | 否       | `7d`           | JWT 过期时间               |
| `BCRYPT_SALT_ROUNDS`                              | 否       | `10`           | bcrypt 加盐轮数            |
| `COOKIE_MAX_AGE`                                  | 否       | `604800` (7天) | Cookie 最大存活时间（秒）  |

> 开发环境下不配置 Redis 变量时，自动使用内存 Mock 存储，零配置即可启动。

## 常用脚本

| 命令             | 说明                                      |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | 启动开发服务器                            |
| `pnpm build`     | 构建生产版本                              |
| `pnpm start`     | 启动生产服务器                            |
| `pnpm lint`      | 代码检查                                  |
| `pnpm lint:fix`  | 自动修复 lint 问题                        |
| `pnpm format`    | Prettier 格式化                           |
| `pnpm typecheck` | TypeScript 类型检查                       |
| `pnpm check`     | lint + typecheck + format 一起跑          |
| `pnpm self-check`| 服务端核心逻辑自检（并发 CAS/幂等/限流算法，无需起服务） |
| `pnpm clean`     | 清理构建产物                              |

### 服务端核心逻辑自检

`pnpm self-check`（在 frontend 目录）验证并发写安全的核心算法：CAS 乐观锁不丢更新、业务错误不重试、stats 原子增量。

```bash
cd frontend && pnpm self-check
```

> 纯算法级断言（node:assert），不依赖服务与数据；全链路接口冒烟见下方「回归验证」。

## 页面路由

> 下表为 `/zh` locale 下的路径；站点启用 `localePrefix: 'always'`，实际 URL 均带 `/{locale}` 前缀（`/en/...` 同理），未带前缀的访问由中间件重定向。
>
> 「渲染方式」一列取自构建产物实测（`.next/prerender-manifest.json`），不是设计意图。

| 路由          | 渲染方式（构建产物实测）                                    | 鉴权   | 说明                                            |
| ------------- | ----------------------------------------------------------- | ------ | ----------------------------------------------- |
| `/`           | ISR —— 构建期预渲染，实测再验证周期 **300s**                | 公开   | 首页 Hero + 最新文章                            |
| `/posts`      | 按请求渲染（读 `searchParams`，无法构建期固化）+ 数据层缓存 | 公开   | 文章列表，支持分页/搜索/分类/标签筛选           |
| `/posts/[id]` | ISR —— `generateStaticParams` 预渲染已有文章，未命中则按需渲染 | 公开 | 文章详情，含 TOC、点赞/收藏、评论区、上下篇导航 |
| `/login`      | 静态预渲染（页壳）+ 客户端表单                              | 公开   | 登录页                                          |
| `/register`   | 静态预渲染（页壳）+ 客户端表单                              | 公开   | 注册页                                          |
| `/profile`    | 按请求渲染（读登录 Cookie，**不预渲染**）                   | 需登录 | 个人中心（我的文章 + 草稿 + 收藏，服务端直取）  |
| `/settings`   | 静态预渲染（页壳）+ 客户端表单                              | 需登录 | 账号设置（资料编辑 + 修改密码）                 |
| `/write`      | 静态预渲染（页壳）+ 客户端编辑器                            | 需登录 | Markdown 编辑器（写文章/编辑文章）              |

> **为什么页面写 `revalidate = 3600`，实测却是 300s**：Next 取「本路由内所有缓存声明的最小值」作为整条路由的再验证周期。
> 数据层 `unstable_cache` 的列表缓存是 300s（见 `frontend/src/services/blog/load.ts` 的 `POSTS_REVALIDATE`），
> 因此实际以 300s 为准。改周期要同时看页面与数据层两处。

## 架构要点

### 三层认证机制

1. **Edge Proxy 中间件** (`proxy.ts`) — 拦截浏览器请求，检查 `auth_token` cookie，受保护路由未登录时 302 重定向至 `/login`
2. **Server Component 鉴权** (`services/auth/load.ts`) — `getCurrentUser()` 通过 React `cache()` 实现请求内去重
3. **API 路由守卫** (`backend/modules/auth/auth-guard.ts`) — `requireAuth()` 强制认证 / `tryAuth()` 可选认证

### Token 机制

- JWT payload: `{ id, email, tokenVersion }`
- 两个 Cookie：`auth_token`（httpOnly，真实 JWT）+ `auth_status`（前端可读，值为 `'1'`）
- 登出/修改密码时 `tokenVersion++`，使所有已签发 Token 失效
- 客户端请求层遇 401 时自动刷新 Token 并重试

### 服务端分层架构

```
API Route Handler
    ↓
Service (业务逻辑)
    ↓
Repository (数据访问)
    ↓
KV Store (KVDocumentStore / KVRepository)
    ↓
KV Adapter (MockKV 内存 | UpstashKVAdapter Redis)
```

> 以上分层全部落在可移植的 `backend/` 包（`@my-app/backend`）：除 `after()` 经 `configureRuntime` 注入外不引用 Next.js，
> 可整体复制进 Express/Koa/Fastify 使用。`frontend` 只保留宿主接线（`src/server/` 与 `src/app/api/**/route.ts`）。

- 依赖注入容器挂载于 `globalThis`，在 Serverless 冷启动后保持状态
- 博客数据为单一 `blog:db` JSON 文档，带 3 次重试的读取-修改-写入
- 用户和评论使用 Redis Hash 存储

### 统一 API 响应格式

```typescript
// 成功
{ "code": 0, "data": T, "message": "操作成功" }

// 错误
{ "code": 401, "data": null, "message": "未授权，请先登录", "details"?: [...] }
```

### 安全特性

- **XSS 防护**：sanitize-html 白名单 + isomorphic-dompurify 双重消毒
- **SSRF 防护**：封面图片 URL 校验
- **CSP / 安全 Headers**：next.config.ts 配置 Content-Security-Policy、HSTS、X-Frame-Options 等
- **密码安全**：bcryptjs 哈希存储
- **限流**：登录/注册接口 5 次/5 分钟（按 IP）
- **httpOnly Cookie**：前端 JS 不可读 Token

### 设计系统

- 采用 CSS 设计令牌系统（`frontend/src/styles/tokens.css`），定义颜色/圆角/阴影/字体/动画变量
- 字体：Inter（拉丁）+ Noto Sans SC（中文），通过 next/font 加载
- 代码高亮：highlight.js 自定义主题（明/暗适配）
- WCAG AA 无障碍性：对比度校准、键盘导航、焦点可见

## 部署

### Netlify 部署

项目内置 `netlify.toml` 配置：

```toml
[build]
  base = "/"
  command = "pnpm install --frozen-lockfile && pnpm run build"
  publish = "frontend/.next"

[build.environment]
  NODE_VERSION = "22"
  PNPM_FLAGS = "--frozen-lockfile"
```

部署前需在 Netlify 环境变量中配置：

- `JWT_SECRET`（>= 32 字符）
- `NEXT_PUBLIC_BASE_URL`
- Upstash Redis 凭据（`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`）

## 相关文档

- [前端架构文档](frontend/README.md)
- [API 接口文档](API.md)
- [注释规范](comment-template/README.md)
- [AI 代理指令](AGENTS.md)

## License

Private

> AI生成
