/**
 * @file navigation.ts
 * @description 路由跳转与导航态判断工具；依赖 window/history，浏览器端函数需在客户端调用
 */

/**
 * 判断是否存在可回退的应用内历史（用于控制"返回"按钮显隐）
 * @returns 服务端渲染时返回 false；优先读 history.state.idx，回退用 history.length
 */
export function hasInAppHistory(): boolean {
  if (typeof window === 'undefined') return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1;
}

/**
 * 支持的语言前缀（与 i18n/routing 的 locales 保持同步；此处保持零依赖不做 import 环引用）
 */
const LOCALE_PREFIXES = ['/zh', '/en'];

/**
 * 剥离路径开头的 locale 前缀
 * @param path 可能带 /zh、/en 前缀的路径
 * @returns 去掉前缀后的裸路径；命中语言根时归一为 '/'
 */
export function stripLocalePrefix(path: string): string {
  for (const prefix of LOCALE_PREFIXES) {
    if (path === prefix) return '/';
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || '/';
  }
  return path;
}

/**
 * 校验重定向目标以防开放重定向：仅允许站内相对路径（保留 locale 前缀）
 *
 * 调用方分两类，注意前缀语义：
 * - 原生跳转（window.location.replace，如登录成功后回跳）：需要带 /zh、/en 前缀的完整路径，直接用返回值
 * - next-intl 客户端路由（localePrefix:'always' 会自动补前缀）：先经 stripLocalePrefix 剥前缀再传，
 *   否则出现 /zh/zh/write 双前缀 404（如 AuthGuard）
 * @param raw 待校验的目标路径
 * @returns 以 / 开头且非 //（协议相对）、且路径本身不是 /login /register（避免回环）时原样返回，否则回退到 '/'
 */
export function safeRedirect(raw: string): string {
  const bare = stripLocalePrefix(raw);
  const ok =
    bare.startsWith('/') && !bare.startsWith('//') && !['/login', '/register'].includes(bare);
  return ok ? raw : '/';
}

/**
 * 判断导航项是否处于激活态
 * @param pathname 当前路径
 * @param href 导航目标路径
 * @returns 根路径 '/' 需完全相等，其余按前缀匹配
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

/**
 * 构造带 redirect 回跳参数的登录页地址
 * @param redirectPath 登录成功后要回跳的目标路径
 * @returns `/login?redirect=...`，回跳路径已 URL 编码
 */
export function buildLoginRedirect(redirectPath: string): string {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}
