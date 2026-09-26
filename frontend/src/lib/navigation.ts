export function hasInAppHistory(): boolean {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" ? idx > 0 : window.history.length > 1;
}

const LOCALE_PREFIXES = ["/zh", "/en"];

export function stripLocalePrefix(path: string): string {
  for (const prefix of LOCALE_PREFIXES) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || "/";
  }
  return path;
}

export function safeRedirect(raw: string): string {
  const bare = stripLocalePrefix(raw);
  const ok =
    bare.startsWith("/") && !bare.startsWith("//") && !["/login", "/register"].includes(bare);
  return ok ? bare : "/";
}

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function buildLoginRedirect(redirectPath: string): string {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}
