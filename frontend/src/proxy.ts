/**
 * @file proxy.ts
 * @description Next.js 16 Proxy 中间件，负责路由守卫与初始语言识别。
 *              受保护路由检查 auth_token cookie，缺失则重定向 /login?redirect=<原路径>
 *              首次访问（无语言偏好 Cookie）时按浏览器 Accept-Language 写入偏好，
 *              使首个 SSR 即按用户语言渲染、无闪烁。
 *              注意：proxy 运行在 Edge Runtime，可读取 httpOnly Cookie；
 *              仅拦截浏览器入站请求，服务端组件内的 fetch 不经过此处。
 *              API Routes 已集成到同域 Next.js App Router，不再需要 API 代理。
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/api/request';
import { PROTECTED_ROUTES } from '@/config/site';
import { LOCALE_COOKIE } from '@/i18n/config';

/**
 * 判断路径是否属于受保护路由
 * @param pathname 当前请求路径
 * @returns 是否受保护
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * 从 Accept-Language 头解析初始语言：英文系返回 en，其余（含缺省）返回 zh
 * @param request 当前请求
 * @returns 初始语言
 */
function detectLocale(request: NextRequest): 'zh' | 'en' {
  const languages = request.headers
    .get('accept-language')
    ?.split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter(Boolean);
  if (languages?.some((lang) => lang === 'en' || lang.startsWith('en-'))) return 'en';
  return 'zh';
}

/**
 * 若无语言偏好 Cookie：解析浏览器语言并写入（请求 + 响应双侧），
 * 使当前这次 SSR 即可读到偏好，同时持久化到浏览器
 * @param request Next.js 请求对象
 * @param response 已构造的响应对象（redirect / next）
 */
function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(LOCALE_COOKIE)?.value) return;
  const locale = detectLocale(request);
  // 写入请求侧：让本次渲染的 cookies() 立即读到
  request.cookies.set(LOCALE_COOKIE, locale);
  // 写入响应侧：持久化到浏览器（1 年，非 httpOnly — 语言切换按钮也会客户端改写）
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}

/**
 * Proxy 入口函数，处理路由守卫与初始语言识别
 * @param request Next.js 请求对象
 * @returns NextResponse — 路由守卫 redirect / 放行 next
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ── 路由守卫 ──
  if (isProtectedRoute(pathname)) {
    const authToken = request.cookies.get(AUTH_COOKIE)?.value;
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      const redirect = NextResponse.redirect(loginUrl);
      applyLocaleCookie(request, redirect);
      return redirect;
    }
  }

  // 语言 Cookie 需写入请求头再放行，本次 SSR 才能读到（Next 标准转发模式）
  const hasLocaleCookie = !!request.cookies.get(LOCALE_COOKIE)?.value;
  if (!hasLocaleCookie) {
    const locale = detectLocale(request);
    request.cookies.set(LOCALE_COOKIE, locale);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

/** proxy 匹配规则：拦截非静态资源的页面路由（不再拦截 /api） */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
