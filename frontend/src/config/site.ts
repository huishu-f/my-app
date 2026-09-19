/**
 * @file site.ts
 * @description 站点级全局配置：站点地址、SEO 元数据、受保护路由、分页与导航常量，供前端各模块统一引用
 */

/** 站点根地址，用于 SEO 绝对链接与 Open Graph；优先取环境变量，本地开发回退到 localhost:3000 */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/** 需登录才能访问的路由前缀（不含 locale 段），由 proxy 中间件做鉴权校验 */
export const PROTECTED_ROUTES = ['/write', '/settings', '/profile'];

/** 列表 / 瀑布流分页每页条数 */
export const PAGE_SIZE = 9;

/** 顶部导航项：href 为跳转路由，key 为对应 i18n 文案键 */
export const NAV_LINKS = [
  { href: '/', key: 'home' },
  { href: '/posts', key: 'posts' },
] as const;
