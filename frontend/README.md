---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'a7a93f1b-6812-481c-8f7c-dbd0bd8ad6cb'
  PropagateID: 'a7a93f1b-6812-481c-8f7c-dbd0bd8ad6cb'
  ReservedCode1: 'b56ccd0d-4b36-4ec0-9cb6-c944045de4d3'
  ReservedCode2: 'b56ccd0d-4b36-4ec0-9cb6-c944045de4d3'
---

# Frontend — 多作者中文技术写作平台

基于 Next.js 16 (App Router) + React 19 + TailwindCSS v4 + 原生 fetch 构建的前端应用。

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 10

### 环境变量

在 `frontend/` 目录下创建 `.env.local`：

```bash
# 站点基础 URL（用于 SEO metadata、sitemap、robots）
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 以下为可选：生产环境建议配置 Upstash Redis（不配时回退内存实现，重启即丢）
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
```

> 服务端 SSR 请求地址由 `NEXT_PUBLIC_BASE_URL` 与请求头自动推断，无需单独的后端地址变量。

### 启动开发

```bash
# 在项目根目录
pnpm dev              # 启动开发服务（frontend）
```

前端默认运行在 `http://localhost:3000`。

### 构建与检查

```bash
pnpm build             # 生产构建
pnpm typecheck         # TypeScript 类型检查
pnpm lint              # ESLint 检查
pnpm lint:fix          # ESLint 自动修复
pnpm format            # Prettier 格式化
pnpm format:check      # Prettier 格式化检查
```

## 技术栈

| 技术                  | 版本      | 用途                                     |
| --------------------- | --------- | ---------------------------------------- |
| Next.js               | 16        | App Router、SSR、Proxy 中间件            |
| React                 | 19        | Server Components + Client Islands       |
| TailwindCSS           | 4         | 原子化 CSS，@theme 令牌系统              |
| fetch API             | -         | 数据请求（RSC 直取 + 客户端 hooks 封装） |
| next-themes           | 0.4       | 明暗主题切换                             |
| react-hot-toast       | 2         | 全局消息提示                             |
| lucide-react          | 1         | 图标库                                   |
| marked + highlight.js | -         | Markdown 渲染 + 代码高亮                 |
| @my-app/shared        | workspace | 前后端共享类型                           |

## 目录结构

```
frontend/src/
  app/                    # Next.js App Router（只放路由约定文件）
    [locale]/
      (auth)/             # 认证路由组（登录/注册）
      (dashboard)/        # 仪表盘路由组（需登录：profile/settings/write）
      posts/              # 文章列表与详情
    api/                  # Route Handler（HTTP 入口，复用 backend 服务）
    globals.css           # 全局样式入口（@import 自 styles/）
  actions/                # 写操作唯一入口（Server Actions）
    post.ts               # 文章增删改
    interaction.ts        # 点赞 / 收藏
    comment.ts            # 评论增改删
    auth.ts               # 资料 / 改密
    run.ts                # Action 骨架（结果契约 / 限流 / 鉴权+变更+失效）
    unwrap.ts             # 客户端解包器（全仓唯一一份）
  services/               # 按域的数据访问
    auth/                 # load.ts（RSC 取数）/ read.ts（API 封装）/ hooks.ts（客户端）
    blog/
    comment/
  features/               # 领域组件，按业务域分目录
    auth/ posts/ comments/ profile/ settings/ write/
  ui/                     # 通用原子组件
    layout/               # 布局组件（Navbar/Footer/UserMenu 等）
  providers/              # Context Provider 聚合（AppProviders.tsx / AuthProvider.tsx）
  hooks/                  # 跨域通用 Hooks（驼峰 useXxx.ts）
    useFetch.ts           # 数据获取 hook（fetch API 三态封装）
    useAsyncAction.ts     # 异步提交 hook（提交态 + 回调分发）
  server/                 # Next 宿主适配（HTTP 路由 / Server Action 的服务端装配层）
    route-handler.ts      # Route Handler 装配（鉴权 + 限流 + 错误映射）
    cache.ts              # unstable_cache 封装
    api-response.ts       # 统一响应格式
    runtime.ts            # after() 注入注册表
    rate-limit-policy.ts  # HTTP 路由 ↔ Server Action 共用限流策略
  lib/                    # 无框架依赖的工具函数
    request.ts            # 同构请求层（Cookie 鉴权/401 刷新）
    format.ts             # 格式化工具
    sanitize.ts           # HTML 消毒
    navigation.ts         # 路由跳转与重定向安全辅助
    toast.ts              # Toast 封装
  config/                 # 站点与 i18n 配置（site.ts / i18n.ts）
  i18n/                   # next-intl 路由、请求配置与文案字典
    messages/             # zh / en 文案
  styles/                 # 全局样式分层
    tokens.css            # 设计令牌（原始色阶 → 语义令牌）
    base.css              # 基础重置
    typography.css        # 排版
    components.css        # 组件样式
    animations.css        # 动画
    hljs-theme.css        # 代码高亮主题
  proxy.ts                # Next.js 16 Proxy（API 代理 + 路由守卫）
```

## 架构要点

### Server Component + Client Island

页面级使用 Server Component（SSR 数据获取），交互部分提取为 `'use client'` 组件。例如文章详情页：

- `page.tsx` (Server) → 获取文章数据、用户信息
- `PostActions` / `CommentsSection` / `PostToc` (Client) → 交互孤岛

### 鉴权架构

三层鉴权：

1. **Edge Proxy** (`proxy.ts`) — 路由守卫 + API 同源代理
2. **Server Component** (`services/auth/load.ts`) — 服务端获取当前用户
3. **Client Hook** (`services/auth/hooks.ts`) — 客户端鉴权状态

### 请求层

`lib/request.ts` 提供同构请求：

- 客户端用相对 `/api`，服务端 SSR 用绝对地址（`NEXT_PUBLIC_BASE_URL` 或请求头推断）
- HttpOnly Cookie 鉴权 + 401 自动刷新

### 类型安全

`@my-app/shared` 包导出前后端共享的类型定义：

- API 契约类型（Post / User / Comment 等）
- UI 组件 Props 类型（ButtonProps / TagProps 等）
- 后端服务接口（BlogService / AuthService 等）

## 设计系统

设计令牌与组件样式见 `src/styles/`（tokens.css / components.css）。

核心原则：

- 中性灰阶为主，四色点缀仅作信号
- 双声部字体：sans 正文+标题 / mono 代码
- 明暗双主题独立校准对比度（WCAG AA）
- 4px 间距网格，12 档字号尺度

> AI生成
