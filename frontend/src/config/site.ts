/**
 * @file 站点级配置
 * @description 集中定义站点基础 URL、元数据、受保护路由、分页大小与导航链接，
 *              供 SEO metadata、sitemap、路由守卫（proxy.ts）与布局组件使用。
 */

/** 站点基础 URL（用于 SEO metadata、sitemap、robots；由环境变量注入，默认本地开发地址） */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/** 站点元数据 */
export const SITE_METADATA = {
  /** Open Graph 使用的 locale 标识 */
  locale: 'zh_CN',
} as const;

/** 受保护路由列表（proxy.ts 路由守卫据此拦截未登录访问） */
export const PROTECTED_ROUTES = ['/write', '/settings', '/profile'];

/** 文章列表每页数量 */
export const PAGE_SIZE = 9;

/** 顶部导航链接（key 指向 i18n messages 的 nav 命名空间翻译键） */
export const NAV_LINKS = [
  { href: '/', key: 'home' },
  { href: '/posts', key: 'posts' },
] as const;
