import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { AUTH_TOKEN_COOKIE } from "@/lib/authConstants";
import { PROTECTED_ROUTES } from "@/config/site";

const intlMiddleware = createMiddleware(routing);

function extractLocale(pathname: string): { locale: string; barePath: string } {
  const firstSegment = pathname.split("/")[1] ?? "";
  if (routing.locales.includes(firstSegment as (typeof routing.locales)[number])) {
    return { locale: firstSegment, barePath: pathname.slice(firstSegment.length + 1) || "/" };
  }
  return { locale: routing.defaultLocale, barePath: pathname };
}

function isProtectedRoute(barePath: string): boolean {
  return PROTECTED_ROUTES.some((route) => barePath === route || barePath.startsWith(`${route}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const intlResponse = intlMiddleware(request);

  const { locale, barePath } = extractLocale(pathname);

  // ponytail: 这里只做「cookie 是否存在」的边缘快速失败，不是授权判定 —— 它不验签、不查库。
  // 三层职责是明确的：边缘拦明显未登录（省一次渲染）、服务端 requireUserOrRedirect 判有效
  // （验签 + tokenVersion + disabled）、客户端 AuthGate 只管加载态。鉴权语义以服务端为准。
  if (isProtectedRoute(barePath)) {
    const authToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
    if (!authToken) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|txt|xml|json|webmanifest|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
