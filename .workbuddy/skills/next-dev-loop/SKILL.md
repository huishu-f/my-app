# Skill: next-dev-loop

适用：Next.js16 项目，搭配 next-devtools MCP
目标：迭代打磨Next项目，自动修复编译、TS、运行时错误，保证页面可正常渲染

## 工作流程

1. 先调用MCP工具 get_page_metadata 读取当前路由、组件结构、Server Action信息
2. 调用 get_compilation_issues 获取Turbopack编译/TS错误
3. 调用 get_errors 获取浏览器+服务端运行时异常
4. 根据错误定位源码，修改对应文件
5. 调用 compile_route 重新编译页面
6. 循环检查：有错误继续修复；无错误后，做UI/性能/缓存审计
7. 输出报告：修改清单、遗留风险、优化建议（缓存策略、组件拆分、Shadcn样式一致性）

## 约束

- 优先保留原有业务逻辑，不要随意重构
- 使用Tailwind + Shadcn UI规范，保持设计统一
- 修改前读取原文件，修改后必须走编译校验
- 改动跨层共享的服务端模块（错误类、缓存工具）后，**必须重启 dev server 再验证**：
  Turbopack 的 Hot Reload 不会重建被重复打进多 chunk 的模块实例，不重启会误判「修复无效」。

## MCP 工具实测陷阱（Next 16.3 + next-devtools）

- `nextjs_index` 自动发现可能失败，**必须显式传 `port`**（如 `{"port":"3000"}`）。
- `compile_route` 经 MCP 包装传参（`args` 字符串）不生效，改用 HTTP 冒烟替代：
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/<路由>`。
- `get_errors` 要先让浏览器打开一个页面（需要客户端会话），否则返回空。
- `get_compilation_issues` / `get_errors` 在 dev 下**只反映最近一次编译**，清空后要重新触发一次渲染才有数据。
- chrome-devtools 的 `take_screenshot` 受 workspace root 限制**不能写文件**，只能内联返回；
  要落盘截图请改写到会话工作目录内。
- 用 a11y 快照（`take_snapshot`）+ `click`/`fill` 驱动真实交互（登录、删除、发布）比猜选择器可靠；
  每次导航后 uid 前缀会变，**必须重新快照**再点。

## 验证原则（踩过的坑）

- **探针要唯一**：用带时间戳的唯一标题验证「删了还在 / 改了没变」。
  早期用播种脚本里已有的标题做探针，因脚本跑过两次、库里有两篇同标题文章，得到的是**假阳性**结论。
- **对照实验定因果**：怀疑某个文件导致行为异常时，先把它移出（如 `mv x.tsx x.tsx.bak`）复测，
  确认因果后再动手重构，不要凭阅读代码直接改结构。
- 客户端缓存类问题**必须在浏览器里跑完整用户动线**（列表 → 详情 → 删除/编辑 → 返回列表），
  并用 `evaluate_script` 读 `document.body.innerText` 判定内容新旧；只在 curl 层验证会漏掉 Client Cache。
- 段级 `loading.tsx` 的流式边界会包住**所有子路由**：父段的 loading 同样会让子路由的 `notFound()`
  无法写状态码（返回 200）。需要「父路由有骨架 + 子路由能返 404」时，把父路由放进路由组 `(group)`。

## 审计报告模板

1. 基线：编译/TS/lint/运行时错误 + 路由状态码矩阵（含 404/401 语义）
2. 问题清单：每条给「现象 → 根因（含证据）→ 修复 → 复测结果」
3. 校验：MCP 编译与错误、typecheck、lint、生产构建路由表、浏览器动线
4. 遗留取舍与需用户决策项（明确标注哪些没改、为什么）
- 遇到Server Action、Cache Components、SSR相关改动，重点校验缓存行为
- 每次迭代输出简明修改清单，重大改动先询问我确认

## 输出格式

1. 当前项目状态摘要
2. 发现的问题清单
3. 代码变更
4. MCP编译校验结果
5. 下一步优化建议

---

## MCP 工具实测要点（踩过的坑，照做可省大量时间）

- **`nextjs_index` 自动发现在 Windows 上经常返回 "No running Next.js dev servers"。**
  不要据此判定「没起服务」。直接带端口再调一次：`nextjs_index({ port: "3000" })`，
  服务在跑就会正常返回 9 个工具。
- **`get_errors` 需要浏览器会话**，否则返回 `No browser sessions connected`。
  先用 chrome-devtools MCP 打开页面（`navigate_page`）再调，才能拿到 `sessionErrors`。
- **`nextjs_call` 的 `args` 参数在本版 MCP 包装下传不进去**（schema 声明 string，
  下游要求 object，JSON 字符串与对象两种传法都报 `Expected object, received string`）。
  因此 `compile_route` 用不了。替代方案：**用 curl 逐个打路由**，效果等价
  （「触发与首次访问相同的按需编译」），还能顺带拿到 HTTP 状态码。
- `get_compilation_issues` / `get_routes` / `get_logs` / `get_project_metadata` 无需浏览器会话，可放心先跑。
- `get_logs` 返回日志文件路径，**服务端堆栈与 logger 输出都在里面**，排查 5xx 必看。

## 关键陷阱：改完代码必须重启 dev server 才是新模块

Turbopack 会把同一个模块**分别打进每个路由 chunk**。实测 `src/server/errors/AppError.ts`
同时存在于 14 个 server chunk。由此产生两个后果：

1. **跨 chunk 的 `instanceof` 恒为 false。** service 层 `new` 的错误实例与路由层 `import`
   到的构造函数不是同一引用。表现为 service 抛出的 4xx 被统一降级成 500。
   修法：在基类构造时写入 `Symbol.for('<app>/AppError')` 品牌（全局符号注册表，重复打包仍同符号），
   用 `isAppError()` / `isAppErrorWithStatus(err, code)` 替代裸 `instanceof`。
   **排查手法**：`grep -rl "class AppError" .next/dev/server/chunks | wc -l`，>1 即可确诊。
2. **HMR 不重建这些重复模块。** 改了类定义后热更新看着像没生效（chunk 文件已是新代码、
   运行时仍是旧实例），极易误判「修复没用」。
   **铁律：改动错误类 / 公共基类 / 跨层共享模块后，先 `node scripts/dev.mjs --free-port-only`
   再重启 dev server，然后才下结论。**

## 常见根因模式（本轮实测命中）

- **中间件 matcher 用「列举文件名」排除静态资源**（如 `favicon.ico|icon.svg`）必漏。
  正确做法是按扩展名排除：
  `'/((?!_next/static|_next/image|api|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|txt|xml|json|webmanifest|woff2?|ttf|otf|css|js|map)$).*)'`
  ——否则 `sitemap.xml` / `robots.txt` / `public/` 全部资源会被加语言前缀重定向后 404。
  排除前先确认动态路由 id 不含点号（如由 slug 生成），避免误伤。
- **`loading.tsx` 与「404 状态码」不可兼得。** 该段存在 `loading.tsx` 时页面外壳先被流式送出，
  之后的 `notFound()` 只能替换内容、改不动状态码（官方文档明确行为），
  结果就是 404 页面以 HTTP 200 返回。缓解：Next 会注入 `noindex`。
  要严格 404 得改用 `dynamicParams = false`，注意与 `generateStaticParams` 的预热上限冲突。
- **错误码回归别只看 200。** 用「状态码断言矩阵」回归才抓得到：
  重复注册→409、不存在资源→404、未登录→401、超限→429、非法参数→400。
  只看响应体 `code` 字段会漏掉「HTTP 状态码与 body 不一致」这类问题。
- **日志里 `code` 与 stack 不一致就是信号**：如 `{"code":"InternalServerError"}` 配
  `ConflictError: ...` 的 stack，说明是 instanceof 判定失败而非真的 500。

## 造数据以便审计 UI

- 本地无 Upstash 时数据走**内存 mock**（`kv-mock.ts`），dev 重启即清空，可放心写演示数据。
- 写接口有 IP 限流（注册 5 次/5 分钟、发布文章有限流），批量播种容易撞 429，需分批或放慢。
- 播种内容要覆盖 UI 分支：多级标题（测目录）、代码块（测高亮）、置顶、草稿（测权限）、
  多分类多标签（测筛选）。
- 注意必填字段（如 `isDraft` 是必填布尔），漏传会 400 而非静默默认。

## 审计顺序建议

1. 编译/类型/lint 基线（`get_compilation_issues` + `tsc --noEmit` + `eslint .`）
2. HTTP 状态码矩阵（含上面那组错误语义断言）
3. 浏览器 console + `get_errors`（逐页走查，含跨导航保留消息）
4. 数据层与缓存策略（`unstable_cache` / `revalidateTag` 签名要**查本项目 node_modules 里的
   版本自带文档** `node_modules/next/dist/docs/`，不要凭记忆——如 Next16 的
   `revalidateTag(tag, { expire: 0 })` 是正确签名，单参数形式才是废弃的）
5. UI：桌面/移动 × 浅色/深色 四组合截图；静态扫一遍组件层有无硬编码颜色
6. 冗余扫描：去注释后做 6 行窗口哈希找跨文件重复块，**并对每组复核**——
   相似但职责相反的组件（如 AuthGate vs AuthGuard）是假阳性，不要盲目合并
7. 生产构建收口（`next build` 能同时验证编译 + TS + 静态生成，并暴露产物类型差异）

## 判定「该不该改」的准则

- 先证伪再动手：用「抽样请求 + 日志」把现象钉死，别从代码猜。
- 根因修在共享函数一次，不要在调用点逐个打补丁（同一缺陷类别会继续复发）。
- 有意的取舍（如客户端只动态加载部分语言包以控体积）**不要为了消除重复而合并**，
  否则是退化；改为共享「怎么做的逻辑」，把「做哪些」留给调用方传参。
- 无法在不牺牲现有 UX 的前提下修的（如 loading.tsx vs 404），**列为待决策项交用户拍板**，
  不要擅自改产品行为。
