/**
 * @file 客户端导航辅助函数
 * @description 提供站内历史判断、登录回跳地址安全校验、路由高亮判定
 *              与登录跳转 URL 构建等纯函数，供客户端组件使用。
 */

/**
 * 判断是否存在可安全 back() 的站内历史
 * @returns true 表示上一条历史记录是站内软导航，可安全调用 router.back()；
 *          服务端渲染（无 window）时恒为 false
 * @description 依据 Next.js App Router 维护的 history.state.idx：
 *              站内每次软导航 idx +1，硬加载/直接打开外链进入时为 0。
 *              不能用 history.length 判断——webview/会话恢复场景下它几乎恒大于 1，
 *              从分享链接直接进入文章页时 back() 会退出站点而非回站内上一页。
 * @warning idx 缺失（非 App Router 环境）时回退用 history.length 判断
 */
export function hasInAppHistory(): boolean {
  if (typeof window === 'undefined') return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1;
}

/**
 * 开放重定向安全校验
 * @param raw 待校验的原始 redirect 值
 * @returns 通过校验的站内绝对路径；不合法时回退 '/'
 * @description 仅放行以单个 '/' 开头的站内路径（拒绝外部 URL、'//' 协议相对地址），
 *              且不允许回跳到 /login、/register 自身
 */
export function safeRedirect(raw: string): string {
  return raw.startsWith('/') && !raw.startsWith('//') && !['/login', '/register'].includes(raw)
    ? raw
    : '/';
}

/**
 * 判断导航链接是否应处于高亮态
 * @param pathname 当前浏览器路径（来自 usePathname）
 * @param href 链接目标路径
 * @returns 首页要求精确匹配；其余路径前缀匹配即高亮
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

/**
 * 构建带回跳参数的登录页 URL
 * @param redirectPath 登录成功后的回跳路径
 * @returns 形如 /login?redirect=... 的 URL 字符串，redirect 值经 encodeURIComponent 编码
 */
export function buildLoginRedirect(redirectPath: string): string {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}
