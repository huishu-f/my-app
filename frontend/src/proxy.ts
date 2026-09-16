/**
 * @file proxy.ts — Next.js 16 Proxy 中间件
 * @description next-intl middleware（locale 检测 + URL 前缀重写）叠加认证守卫。
 *              受保护路由检查 auth_token cookie，缺失则重定向到 /{locale}/login?redirect=...
 *              next-intl middleware 负责 Accept-Language 检测与 locale 前缀注入，
 *              认证守卫在 next-intl 处理之后执行（pathname 已含 locale 前缀）。
 */
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { AUTH_COOKIE } from '@/lib/api/request';
import { PROTECTED_ROUTES } from '@/config/site';

const intlMiddleware = createMiddleware(routing);

/** 提取路径中的 locale 前缀 */
function extractLocale(pathname: string): { locale: string; barePath: string } {
  const match = pathname.match(/^\/(zh|en)(\/.*)?$/);
  if (match) {
    return { locale: match[1], barePath: match[2] || '/' };
  }
  return { locale: routing.defaultLocale, barePath: pathname };
}

/** 判断裸路径是否属于受保护路由 */
function isProtectedRoute(barePath: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => barePath === route || barePath.startsWith(`${route}/`),
  );
}

/**
 * Proxy 入口：先执行 next-intl middleware（locale 检测/重写），再叠加认证守卫
 * @param request Next.js 请求对象
 * @returns NextResponse — 重定向或放行
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

/** proxy 匹配规则：拦截非静态资源的页面路由（不拦截 /api） */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)'],
};
