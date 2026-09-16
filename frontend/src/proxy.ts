/**
 * @file Next.js Proxy 中间件
 * @description next-intl middleware（Accept-Language 检测 + locale URL 前缀注入/重写）
 *              叠加认证守卫：受保护路由缺失 auth_token Cookie 时重定向到登录页并携带 redirect 参数。
 *              执行顺序：先由 next-intl 处理（pathname 已含 locale 前缀），再做认证检查。
 */
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { AUTH_COOKIE } from '@/lib/api/request';
import { PROTECTED_ROUTES } from '@/config/site';

/** next-intl 中间件实例（负责 locale 检测与前缀重写） */
const intlMiddleware = createMiddleware(routing);

/**
 * 提取路径中的 locale 前缀
 * @param pathname 完整路径名（形如 /zh/posts 或 /posts）
 * @returns locale 与去掉前缀后的裸路径；无前缀时 locale 回退默认语言、裸路径原样返回
 */
function extractLocale(pathname: string): { locale: string; barePath: string } {
  const match = pathname.match(/^\/(zh|en)(\/.*)?$/);
  if (match) {
    return { locale: match[1], barePath: match[2] || '/' };
  }
  return { locale: routing.defaultLocale, barePath: pathname };
}

/**
 * 判断裸路径是否属于受保护路由
 * @param barePath 去掉 locale 前缀的路径
 * @returns 命中受保护路由本身或其子路径时返回 true
 */
function isProtectedRoute(barePath: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => barePath === route || barePath.startsWith(`${route}/`),
  );
}

/**
 * Proxy 入口：next-intl 中间件 + 认证守卫
 * @param request Next.js 请求对象
 * @returns 受保护路由未登录时重定向 /{locale}/login?redirect=...，否则放行（含 intl 重写响应）
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 先让 next-intl 处理（可能重定向 / → /zh）
  const intlResponse = intlMiddleware(request);

  // next-intl 重写后，request.nextUrl.pathname 可能已变（如 / → /zh）
  // 但 cookies 检查用原始 request 即可
  const { locale, barePath } = extractLocale(pathname);

  if (isProtectedRoute(barePath)) {
    const authToken = request.cookies.get(AUTH_COOKIE)?.value;
    if (!authToken) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

/** proxy 匹配规则：拦截除静态资源与 /api 之外的页面路由 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)'],
};
