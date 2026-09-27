export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const PROTECTED_ROUTES = ["/write", "/settings", "/profile"];

export const PAGE_SIZE = 9;

export const HOME_PAGE_SIZE = 6;

export const STATIC_PARAMS_LIMIT = 100;

export const SITEMAP_LIMIT = 1000;

export const REFRESH_RATE_LIMIT = 30;

export const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/posts", key: "posts" },
] as const;
