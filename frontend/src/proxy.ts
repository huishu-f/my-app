/**
 * @file proxy.ts
 * @description Next.js 中间件：先执行 next-intl 国际化路由，再对受保护路由校验登录态，未登录重定向到登录页并携带回跳地址
 */
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { AUTH_COOKIE } from '@/lib/api/request';
import { PROTECTED_ROUTES } from '@/config/site';

/** next-intl 中间件实例，按 routing 配置处理语言前缀识别与默认语言重定向 */
const intlMiddleware = createMiddleware(routing);

/**
 * 从路径中拆分语言前缀与去 locale 的裸路径
 * @param pathname 请求路径，以受支持的 locale 前缀（如 /zh、/en）开头
 * @returns
 * - `locale`   命中的语言；未命中前缀时取 routing.defaultLocale
 * - `barePath` 去掉语言前缀后的路径；无前缀时为原路径，命中语言根时归一化为 '/'
 */
function extractLocale(pathname: string): { locale: string; barePath: string } {
  // 取第一段路径与 routing.locales 匹配，单一真源：新增语言只改 i18n/routing
  const firstSegment = pathname.split('/')[1] ?? '';
  if (routing.locales.includes(firstSegment as (typeof routing.locales)[number])) {
    return { locale: firstSegment, barePath: pathname.slice(firstSegment.length + 1) || '/' };
  }
  return { locale: routing.defaultLocale, barePath: pathname };
}

/**
 * 判断裸路径是否命中受保护路由
 * @param barePath 已去除 locale 前缀的路径
 * @returns 与 PROTECTED_ROUTES 中某项精确相等或为其子路径时为 true
 */
function isProtectedRoute(barePath: string): boolean {
  return PROTECTED_ROUTES.some((route) => barePath === route || barePath.startsWith(`${route}/`));
}

/**
 * 中间件主入口：应用国际化并对受保护路由做登录拦截
 * @param request 当前请求
 * @returns 命中受保护路由且无登录 Cookie 时，302 重定向到 /{locale}/login 并以 redirect 参数保留原路径与查询串；否则返回 intlMiddleware 的处理结果
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 交由 next-intl 完成语言协商与重定向
  const intlResponse = intlMiddleware(request);

  // 解析出裸路径，用于受保护路由匹配（与 locale 前缀无关）
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

/** 中间件生效范围：除静态资源与 api 前缀外的全部路径都进入 proxy */
export const config = {
  /**
   * 负向预查 (?!...) 跳过 _next 静态/图片、/api 路由，以及「带已知静态扩展名的文件」。
   * 按扩展名排除而非逐个列举文件名：sitemap.xml、robots.txt 与 public/ 下的图片字体等
   * 若进入 next-intl，会被加上语言前缀重定向到 /zh/<file> 并 404（曾导致 SEO 元数据路由
   * 与全部 public 静态资源不可访问）。文章动态路由的 id 由 slug() 生成、不含点号，不受影响。
   */
  matcher: [
    '/((?!_next/static|_next/image|api|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|txt|xml|json|webmanifest|woff2?|ttf|otf|css|js|map)$).*)',
  ],
};
