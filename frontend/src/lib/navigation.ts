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
