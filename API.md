---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'b856ef37-21ea-4dc4-ba5c-f70fcd71a971'
  PropagateID: 'b856ef37-21ea-4dc4-ba5c-f70fcd71a971'
  ReservedCode1: '2560dded-bd64-4813-a517-725716643c77'
  ReservedCode2: '2560dded-bd64-4813-a517-725716643c77'
---

# API 接口文档

共 **26 个端点**，分布在 4 个模块中。所有响应使用统一 JSON 格式。

## 目录

- [通用约定](#通用约定)
- [认证模块 (7 个)](#认证模块)
- [文章模块 (9 个)](#文章模块)
- [评论模块 (4 个)](#评论模块)
- [其他模块 (6 个)](#其他模块)
- [错误码参考](#错误码参考)

---

## 通用约定

### 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `/api` |
| Content-Type | `application/json` |
| 认证方式 | httpOnly Cookie (`auth_token`)，由登录接口下发 |
| 运行时 | Node.js |

### 统一响应格式

```jsonc
// 成功 (HTTP 2xx)
{
  "code": 0,
  "data": { /* 响应数据，可能为 null */ },
  "message": "操作成功"
}

// 错误 (HTTP 4xx/5xx)
{
  "code": 401,           // 与 HTTP status code 一致
  "data": null,
  "message": "未授权，请先登录",
  "details": [           // 可选，仅 ValidationError 携带
    { "path": ["email"], "message": "无效的邮箱格式" }
  ]
}
```

### 认证说明

| 标记 | 含义 |
|------|------|
| 无 | 公开接口，无需登录 |
| **可选登录** | 使用 `tryAuth`，登录用户可获取额外数据（如查看草稿） |
| **必须登录** | 使用 `requireAuth`，未登录返回 401 |

认证流程：
1. 登录成功后，服务端通过 `Set-Cookie` 下发 `auth_token`（httpOnly）和 `auth_status`（前端可读）
2. 后续请求浏览器自动携带 Cookie
3. Token 过期时，客户端自动调用 `/api/auth/refresh` 刷新
4. 登出/修改密码后 `tokenVersion` 递增，旧 Token 立即失效

### 限流

| 接口 | 限制 |
|------|------|
| `POST /api/auth/login` | 5 次 / 5 分钟（按 IP） |
| `POST /api/auth/register` | 5 次 / 5 分钟（按 IP） |

超限返回 `429 Too Many Requests`。

---

## 认证模块

### POST `/api/auth/register` — 用户注册

注册新用户。注册后不会自动登录，需跳转登录页。

**限流**: 5 次 / 5 分钟（按 IP）

**请求体**:

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|---------|------|
| `email` | string | 是 | 合法邮箱格式 | 邮箱 |
| `password` | string | 是 | 6-128 字符 | 密码 |
| `firstName` | string | 是 | 1-50 字符 | 名 |
| `lastName` | string | 是 | 1-50 字符 | 姓 |
| `username` | string | 是 | 3-30 字符，仅字母数字下划线 | 用户名 |

**请求示例**:

```json
{
  "email": "user@example.com",
  "password": "123456",
  "firstName": "三",
  "lastName": "张",
  "username": "zhangsan"
}
```

**成功响应** (201):

```json
{
  "code": 0,
  "data": {
    "user": {
      "id": "uuid-xxx",
      "email": "user@example.com",
      "username": "zhangsan",
      "firstName": "三",
      "lastName": "张",
      "role": "Writer",
      "avatar": "",
      "bio": "",
      "location": "",
      "website": "",
      "social": {},
      "stats": { "articles": 0, "likes": 0, "views": 0 },
      "likedArticles": [],
      "favoritedArticles": [],
      "createdAt": "2026-09-10T00:00:00.000Z",
      "updatedAt": "2026-09-10T00:00:00.000Z"
    }
  },
  "message": "注册成功，请登录"
}
```

**错误响应**:

| HTTP | code | 场景 |
|------|------|------|
| 400 | `ValidationError` | 字段校验失败 |
| 409 | `Conflict` | 邮箱或用户名已存在 |
| 429 | `RateLimitError` | 请求频率超限 |

---

### POST `/api/auth/login` — 用户登录

**限流**: 5 次 / 5 分钟（按 IP）

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 合法邮箱（自动转小写） |
| `password` | string | 是 | 非空 |

**请求示例**:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**成功响应** (200):

```json
{
  "code": 0,
  "data": null,
  "message": "登录成功"
}
```

同时通过 `Set-Cookie` 下发：
- `auth_token` — JWT Token（httpOnly，7 天有效）
- `auth_status` — 值为 `1`（前端可读，用于判断登录状态）

**错误响应**:

| HTTP | code | 场景 |
|------|------|------|
| 400 | `ValidationError` | 字段校验失败 |
| 401 | `Unauthorized` | 邮箱或密码错误 |
| 403 | `Forbidden` | 账号已被禁用 |

---

### POST `/api/auth/logout` — 登出

**认证**: 可选登录（`tryAuth`）——无 Token / Token 过期 / 验签失败也返回 200，仅清 Cookie

**请求参数**: 无

**成功响应** (200):

```json
{
  "code": 0,
  "data": null,
  "message": "登出成功"
}
```

始终清除鉴权 Cookie；当携带有效 Token 时额外递增 `tokenVersion`，使该用户所有已签发 Token 失效。

---

### POST `/api/auth/refresh` — 刷新 Token

需要携带 `auth_token` Cookie，允许 Token 已过期——但仅限过期后 7 天内（`JWT_REFRESH_GRACE_SECONDS`），超窗必须重新登录；签名无效的 Token 一律拒绝。

**认证**: Cookie（允许过期）

**请求参数**: 无

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "user": { /* SafeUser */ }
  },
  "message": "Token 已刷新"
}
```

重新设置 Cookie（新 Token）。

**错误响应**:

| HTTP | code | 场景 |
|------|------|------|
| 401 | `Unauthorized` | Token 签名无效 |
| 401 | `Unauthorized` | 用户不存在 |
| 401 | `Unauthorized` | tokenVersion 不匹配 |
| 403 | `Forbidden` | 账号已被禁用 |

---

### GET `/api/auth/me` — 获取当前用户

**认证**: 必须登录

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "user": { /* SafeUser */ }
  },
  "message": "获取成功"
}
```

**SafeUser 结构**（不含 password / tokenVersion / disabled）:

```jsonc
{
  "id": "uuid-xxx",
  "email": "user@example.com",
  "username": "zhangsan",
  "firstName": "三",
  "lastName": "张",
  "role": "Writer",
  "avatar": "",
  "bio": "",
  "location": "",
  "website": "",
  "social": {},
  "stats": { "articles": 0, "likes": 0, "views": 0 },
  "likedArticles": [],
  "favoritedArticles": [],
  "createdAt": "2026-09-10T00:00:00.000Z",
  "updatedAt": "2026-09-10T00:00:00.000Z"
}
```

---

### PUT `/api/auth/profile` — 更新个人资料

**认证**: 必须登录

**请求体**（全部可选）:

| 字段 | 类型 | 校验规则 | 说明 |
|------|------|---------|------|
| `firstName` | string | max 50 | 名 |
| `lastName` | string | max 50 | 姓 |
| `avatar` | string | max 500，白名单图床的 https 链接 | 头像 URL |
| `bio` | string | max 280 | 个人简介 |
| `location` | string | max 100 | 位置 |
| `website` | string | max 200，需 `http(s)://` | 个人网站 |

**请求示例**:

```json
{
  "bio": "全栈开发者",
  "location": "北京",
  "website": "https://example.com"
}
```

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "user": { /* SafeUser */ }
  },
  "message": "资料更新成功"
}
```

更新资料时会同步更新该用户在评论中的 `userName` / `userAvatar` 和文章中的 `authorName`。

---

### POST `/api/auth/change-password` — 修改密码

**认证**: 必须登录

**请求体**:

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|---------|------|
| `currentPassword` | string | 是 | 非空 | 当前密码 |
| `newPassword` | string | 是 | 6-128 字符，不能与 currentPassword 相同 | 新密码 |

**请求示例**:

```json
{
  "currentPassword": "old123",
  "newPassword": "new456"
}
```

**成功响应** (200):

```json
{
  "code": 0,
  "data": null,
  "message": "密码修改成功，请重新登录"
}
```

清除 Cookie 并递增 `tokenVersion`，强制重新登录。

**错误响应**:

| HTTP | code | 场景 |
|------|------|------|
| 400 | `ValidationError` | 新密码校验失败 |
| 401 | `Unauthorized` | 当前密码错误 |

---

## 文章模块

### POST `/api/posts/[id]/view` — 记录浏览

为文章累加一次浏览量（旁路统计）。同一 IP 对同一文章 5 分钟内最多计 30 次，超出或文章为草稿时静默不计数但仍返回成功；写入在响应后异步执行（`after()`），不阻塞响应。

**认证**: 无需认证

**Path 参数**: `id`

**请求参数**: 无

**成功响应** (200):

```json
{ "code": 0, "data": null, "message": "已记录" }
```

---

### GET `/api/posts` — 文章列表

**认证**: 可选登录（登录后可查看草稿）

**Query 参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `draft` | string (`'true'`) | 草稿模式，仅返回当前用户草稿 |
| `category` | string | 分类筛选（max 50） |
| `tag` | string | 标签筛选（max 50） |
| `q` | string | 关键词搜索（max 100） |
| `page` | number | 页码（默认 1） |
| `limit` | number | 每页条数（默认 10，公开接口上限 100） |

**请求示例**:

```
GET /api/posts?category=技术&page=1&limit=9
```

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "posts": [
      {
        "id": "uuid-xxx",
        "title": "文章标题",
        "summary": "文章摘要",
        "content": "正文摘要（列表场景截断为 300 字符的 Markdown）",
        "category": "技术",
        "tags": ["React", "Next.js"],
        "authorId": "user-uuid",
        "authorName": "张三",
        "isDraft": false,
        "pinned": false,
        "coverImage": "https://...",
        "views": 42,
        "likes": 5,
        "favorites": 2,
        "commentsCount": 3,
        "createdAt": "2026-09-10T00:00:00.000Z",
        "updatedAt": "2026-09-10T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 9,
    "totalPages": 12
  },
  "message": "获取成功"
}
```

---

### POST `/api/posts` — 创建文章

**认证**: 必须登录

**请求体**:

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|---------|------|
| `title` | string | 是 | 非空，max 200 | 标题 |
| `content` | string | 是 | 非空，max 200000 | 正文（Markdown） |
| `category` | string | 是 | 非空，max 50 | 分类 |
| `isDraft` | boolean | 是 | — | 是否草稿 |
| `summary` | string | 否 | max 500 | 摘要（留空自动生成） |
| `tags` | string \| string[] | 否 | max 300/30 | 标签（逗号分隔字符串或数组） |
| `pinned` | boolean | 否 | — | 是否置顶 |
| `coverImage` | string | 否 | 白名单图床的 https 链接或空字符串 | 封面图 |

**请求示例**:

```json
{
  "title": "React 19 新特性",
  "content": "# React 19\n\n这是一个新特性介绍...",
  "category": "前端",
  "tags": ["React", "JavaScript"],
  "isDraft": false
}
```

**成功响应** (201):

```json
{
  "code": 0,
  "data": {
    "post": { /* Post */ }
  },
  "message": "创建成功"
}
```

---

### GET `/api/posts/[id]` — 文章详情

**认证**: 可选登录（仅作者可查看草稿）

**Path 参数**: `id` — 文章 ID

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "post": {
      "id": "uuid-xxx",
      "title": "文章标题",
      "content": "<p>渲染后的 HTML</p>",
      "contentRaw": "原始 Markdown（用于编辑预填）",
      "category": "前端",
      "tags": ["React"],
      "authorId": "user-uuid",
      "authorName": "张三",
      "isDraft": false,
      "pinned": false,
      "coverImage": "",
      "views": 43,
      "likes": 5,
      "favorites": 2,
      "commentsCount": 3,
      "createdAt": "2026-09-10T00:00:00.000Z",
      "updatedAt": "2026-09-10T00:00:00.000Z"
    }
  },
  "message": "获取成功"
}
```

每次访问浏览量 +1。Markdown 会被渲染为 HTML 并经过 XSS 消毒。

---

### PUT `/api/posts/[id]` — 更新文章

**认证**: 必须登录（仅作者可操作）

**Path 参数**: `id`

**请求体**: 同 [POST `/api/posts`](#post-apiposts--创建文章)，全部字段可选（`Partial<CreatePostDto>`）。支持草稿 <-> 发布切换。

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "post": { /* Post */ }
  },
  "message": "更新成功"
}
```

**错误响应**:

| HTTP | code | 场景 |
|------|------|------|
| 403 | `Forbidden` | 非文章作者 |
| 404 | `NotFound` | 文章不存在 |

---

### DELETE `/api/posts/[id]` — 删除文章

**认证**: 必须登录（仅作者可操作）

**Path 参数**: `id`

**成功响应** (200):

```json
{
  "code": 0,
  "data": null,
  "message": "删除成功"
}
```

级联删除该文章的所有评论，并清理所有用户中对该文章的点赞/收藏记录。

---

### GET `/api/posts/[id]/neighbors` — 相邻文章

获取当前文章的上一篇和下一篇（仅在已发布文章中查找）。

**认证**: 无需认证

**Path 参数**: `id`

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "prev": { /* Post 摘要 | null */ },
    "next": { /* Post 摘要 | null */ }
  },
  "message": "获取成功"
}
```

---

### POST `/api/posts/[id]/like` — 点赞 / 取消点赞

切换点赞状态（已赞则取消，未赞则添加）。

**认证**: 必须登录

**Path 参数**: `id`

**请求参数**: 无

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "liked": true,
    "likes": 6
  },
  "message": "操作成功"
}
```

---

### POST `/api/posts/[id]/favorite` — 收藏 / 取消收藏

切换收藏状态。

**认证**: 必须登录

**Path 参数**: `id`

**请求参数**: 无

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "favorited": true,
    "favorites": 3
  },
  "message": "操作成功"
}
```

---

## 评论模块

### GET `/api/posts/[id]/comments` — 评论列表

**认证**: 可选登录

**Path 参数**: `id` — 文章 ID

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "comments": [
      {
        "id": "comment-uuid",
        "postId": "post-uuid",
        "userId": "user-uuid",
        "userName": "张三",
        "userAvatar": "",
        "content": "评论内容（已消毒 HTML）",
        "createdAt": "2026-09-10T00:00:00.000Z",
        "updatedAt": "2026-09-10T00:00:00.000Z"
      }
    ]
  },
  "message": "获取成功"
}
```

---

### POST `/api/posts/[id]/comments` — 发表评论

**认证**: 必须登录

**Path 参数**: `id` — 文章 ID

**请求体**:

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|---------|------|
| `content` | string | 是 | 非空，max 2000 | 评论内容 |

**请求示例**:

```json
{
  "content": "写得很好！"
}
```

**成功响应** (201):

```json
{
  "code": 0,
  "data": {
    "comment": { /* Comment */ }
  },
  "message": "发表评论成功"
}
```

同时更新文章的 `commentsCount`。评论内容会经过 HTML 消毒。

---

### PUT `/api/comments/[id]` — 编辑评论

**认证**: 必须登录（仅评论作者可操作）

**Path 参数**: `id` — 评论 ID

**请求体**:

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|---------|------|
| `content` | string | 是 | 非空，max 2000 | 修改后的内容 |

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "comment": { /* Comment */ }
  },
  "message": "编辑成功"
}
```

**错误响应**:

| HTTP | code | 场景 |
|------|------|------|
| 403 | `Forbidden` | 非评论作者 |
| 404 | `NotFound` | 评论不存在 |

---

### DELETE `/api/comments/[id]` — 删除评论

**认证**: 必须登录（评论作者或文章作者均可删除）

**Path 参数**: `id` — 评论 ID

**请求参数**: 无

**成功响应** (200):

```json
{
  "code": 0,
  "data": null,
  "message": "删除成功"
}
```

同时递减文章的 `commentsCount`。

---

## 其他模块

### GET `/api/favorites` — 收藏列表

获取当前用户收藏的所有文章。

**认证**: 必须登录

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "posts": [ /* Post[] */ ]
  },
  "message": "获取成功"
}
```

---

### GET `/api/categories` — 分类列表

获取所有已发布文章的分类。

**认证**: 无需认证

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "categories": ["技术", "生活", "随笔"]
  },
  "message": "获取成功"
}
```

---

### GET `/api/tags` — 标签列表

获取所有已发布文章的标签，去重并排序，附带文章数量。

**认证**: 无需认证

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "tags": [
      { "name": "React", "count": 5 },
      { "name": "Next.js", "count": 3 },
      { "name": "TypeScript", "count": 2 }
    ]
  },
  "message": "获取成功"
}
```

---

### GET `/api/config` — 站点配置

**认证**: 无需认证

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "config": {
      "blogName": "我的博客",
      "author": "作者名"
    }
  },
  "message": "获取成功"
}
```

---

### PUT `/api/config` — 更新站点配置

**认证**: 必须登录（需 Admin 角色，Writer 角色返回 403）

**请求体**（全部可选）:

| 字段 | 类型 | 校验规则 | 说明 |
|------|------|---------|------|
| `blogName` | string | max 100 | 博客名称 |
| `author` | string | max 100 | 作者名 |

**请求示例**:

```json
{
  "blogName": "技术小站",
  "author": "张三"
}
```

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "config": { "blogName": "技术小站", "author": "张三" }
  },
  "message": "更新成功"
}
```

---

### GET `/api/health` — 健康检查

**认证**: 无需认证

**成功响应** (200):

```json
{
  "code": 0,
  "data": {
    "status": "ok",
    "timestamp": "2026-09-10T12:00:00.000Z",
    "kv": {
      "adapterType": "upstash"  // "upstash"=持久化 Redis | "memory"=内存实现(数据不跨实例且重启即丢)
    }
  },
  "message": "OK"
}
```

---

## 错误码参考

| HTTP Status | code 字段 | 错误类 | 说明 |
|-------------|----------|--------|------|
| 400 | `BadRequest` | BadRequestError | 请求参数错误 |
| 400 | `ValidationError` | ValidationError | Zod 校验失败，携带 `details` |
| 401 | `Unauthorized` | UnauthorizedError | 未登录 / Token 无效 / Token 过期 |
| 403 | `Forbidden` | ForbiddenError | 账号被禁用 / 无操作权限 |
| 404 | `NotFound` | NotFoundError | 资源不存在 |
| 409 | `Conflict` | ConflictError | 邮箱/用户名冲突 |
| 422 | `UnprocessableEntity` | UnprocessableEntityError | 请求内容不符合规则 |
| 429 | `RateLimitError` | RateLimitError | 请求频率超限 |
| 500 | `InternalServerError` | InternalServerError | 未捕获的服务端异常 |

---

## 图片地址白名单

`coverImage`（文章封面）与 `avatar`（用户头像）**只接受白名单图床的 https 链接**，保存时即校验：

- 白名单外域名 → `coverImage` 返回 **422**，`avatar` 返回 **400**
- `http://` 链接 → 同上（渲染侧 `next/image` 只接受 https，故写入侧一并收紧）
- 内网 / 元数据地址（`localhost`、`10.*`、`192.168.*` 等）→ 不在白名单，同样被拒

**唯一真源**：`frontend/src/lib/validators.ts` 的 `ALLOWED_IMAGE_HOSTS`。新增图床只需改这一处 ——
它同时驱动 `next.config.ts` 的 `images.remotePatterns`（构建期放行）与前端 `isSafeImageUrl`（渲染兜底），
三处不会再有"能保存、却渲染不出来"的漂移。

当前白名单：`images.unsplash.com` / `images.pexels.com` / `n.colorhub.me`

> 注意：文章**正文内**的 Markdown 图片不受此限制（走 sanitize 白名单标签渲染，不经 `next/image`）。

---

## 端点总览

| # | 方法 | 路径 | 认证 | 限流 | 说明 |
|---|------|------|------|------|------|
| 1 | POST | `/api/auth/register` | 无 | 5次/5min | 用户注册 |
| 2 | POST | `/api/auth/login` | 无 | 5次/5min | 用户登录 |
| 3 | POST | `/api/auth/logout` | 可选登录 | 无 | 登出 |
| 4 | POST | `/api/auth/refresh` | Cookie（宽限期内的过期 Token 亦可） | 30次/min | 刷新 Token |
| 5 | GET | `/api/auth/me` | 必须登录 | 无 | 获取当前用户 |
| 6 | PUT | `/api/auth/profile` | 必须登录 | 无 | 更新个人资料 |
| 7 | POST | `/api/auth/change-password` | 必须登录 | 无 | 修改密码 |
| 8 | GET | `/api/posts` | 可选登录 | 无 | 文章列表 |
| 9 | POST | `/api/posts` | 必须登录 | 10次/5min | 创建文章 |
| 10 | GET | `/api/posts/[id]` | 可选登录 | 无 | 文章详情 |
| 11 | PUT | `/api/posts/[id]` | 必须登录 | 无 | 更新文章 |
| 12 | DELETE | `/api/posts/[id]` | 必须登录 | 无 | 删除文章 |
| 13 | POST | `/api/posts/[id]/view` | 无 | 30次/5min | 记录浏览 |
| 14 | GET | `/api/posts/[id]/neighbors` | 无 | 无 | 相邻文章 |
| 15 | POST | `/api/posts/[id]/like` | 必须登录 | 30次/min | 点赞/取消 |
| 16 | POST | `/api/posts/[id]/favorite` | 必须登录 | 30次/min | 收藏/取消 |
| 17 | GET | `/api/posts/[id]/comments` | 可选登录 | 无 | 评论列表 |
| 18 | POST | `/api/posts/[id]/comments` | 必须登录 | 10次/5min | 发表评论 |
| 19 | PUT | `/api/comments/[id]` | 必须登录 | 无 | 编辑评论 |
| 20 | DELETE | `/api/comments/[id]` | 必须登录 | 无 | 删除评论 |
| 21 | GET | `/api/favorites` | 必须登录 | 无 | 收藏列表 |
| 22 | GET | `/api/categories` | 无 | 无 | 分类列表 |
| 23 | GET | `/api/tags` | 无 | 无 | 标签列表 |
| 24 | GET | `/api/config` | 无 | 无 | 站点配置 |
| 25 | PUT | `/api/config` | 必须 Admin | 无 | 更新配置 |
| 26 | GET | `/api/health` | 无 | 无 | 健康检查 |

> AI生成