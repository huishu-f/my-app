/**
 * @file navigation.ts
 * @description 客户端导航辅助
 */

/**
 * 是否存在可安全 back() 的站内历史。
 * 判据用 Next.js App Router 维护的 history.state.idx（站内每次软导航 +1，
 * 硬加载/直接打开链接时为 0）。不能用 history.length 判断：手机 webview /
 * 浏览器会话恢复场景下它几乎恒 > 1，从分享链接直接进文章时 back() 会退出
 * 站点（回到微信/空白页）而不是回站内上一页。
 * @returns true 表示上一条历史是站内软导航，可安全 router.back()
 */
export function hasInAppHistory(): boolean {
  if (typeof window === 'undefined') return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1;
}

/**
 * 开放重定向安全校验 — 只允许站内绝对路径（非 // 协议相对、非 /login /register）
 * @param raw 待校验的原始 redirect 值
 * @returns 安全的站内路径，不合法时回退 '/'
 */
export function safeRedirect(raw: string): string {
  return raw.startsWith('/') && !raw.startsWith('//') && !['/login', '/register'].includes(raw)
    ? raw
    : '/';
}

/**
 * 路由高亮判定 — 首页精确匹配，其余前缀匹配
 * @param pathname 当前浏览器路径（来自 usePathname）
 * @param href 链接目标路径
 * @returns 是否高亮
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

/**
 * 构建 /login?redirect= 登录跳转 URL — 统一 encodeURIComponent
 * @param redirectPath 登录后回跳路径
 * @returns 编码后的完整 URL 字符串
 */
export function buildLoginRedirect(redirectPath: string): string {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}
