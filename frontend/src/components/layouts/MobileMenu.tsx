"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X, FileText, Home, LogIn, SquareArrowRightExit, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { NAV_LINKS } from "@/config/site";
import { isRouteActive } from "@/lib/navigation";
import { useDismissable } from "@/hooks/useDismissable";
import { useLogoutRedirect } from "@/hooks/useLogoutRedirect";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { getInitials } from "@/lib/format";
import { ThemeGlyph, useThemeMode } from "./ThemeToggle";
import { LocaleGlyph, LOCALE_LABELS, useLocaleSwitch } from "./LanguageToggle";
import { userMenuItems } from "./UserMenu";

const NAV_ICONS = { home: Home, posts: FileText } as const;

const ROW_ICON = { size: 18, strokeWidth: 2.25, className: "h-4.5 w-4.5 shrink-0" } as const;

export function MobileMenu() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { user, loading } = useAuth();
  const { isDark, setDark } = useThemeMode();
  const { locale, next, isPending, switchTo } = useLocaleSwitch();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const toggleRef = useRef<HTMLButtonElement>(null);

  const wasOpenRef = useRef(false);

  const isLoggedIn = !!user;

  const displayName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  const initials = getInitials(user?.firstName ?? "", user?.lastName ?? "");

  const close = () => setMobileOpen(false);

  const handleLogout = useLogoutRedirect(close);

  const isActive = (href: string) => isRouteActive(pathname, href);

  useEffect(() => {
    setMounted(true);
  }, []);

  useDismissable(mobileOpen, close, [mobileMenuRef, toggleRef], {
    lockScroll: true,
  });

  useEffect(() => {
    if (mobileOpen) {
      mobileMenuRef.current?.focus();
    } else if (wasOpenRef.current) {
      toggleRef.current?.focus();
    }
    wasOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  return (
    <>
      <button
        ref={toggleRef}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
        aria-expanded={mobileOpen}
        className="icon-btn-ghost hidden max-md:flex"
      >
        {mobileOpen ? <X {...ROW_ICON} /> : <Menu {...ROW_ICON} />}
      </button>

      {mounted &&
        createPortal(
          <div
            className={`modal-overlay ease-smooth fixed top-(--nav-h) right-0 bottom-0 left-0 z-(--z-overlay) transition-[opacity,visibility] duration-[var(--duration-fast)] ${
              mobileOpen
                ? "pointer-events-auto visible opacity-100"
                : "pointer-events-none invisible opacity-0"
            }`}
            onClick={close}
            aria-hidden="true"
          />,
          document.body,
        )}

      {mounted &&
        createPortal(
          <div
            ref={mobileMenuRef}
            tabIndex={-1}
            aria-hidden={!mobileOpen}
            inert={!mobileOpen ? true : undefined}
            className={`mobile-sheet ease-smooth transition-[opacity,visibility,translate] duration-[var(--duration-fast)] ${
              mobileOpen
                ? "visible translate-y-0 opacity-100"
                : "invisible -translate-y-1 opacity-0"
            }`}
          >
            {isLoggedIn && (
              <Link href="/profile" onClick={close} className="sheet-identity">
                <Avatar
                  initials={initials}
                  src={user?.avatar || undefined}
                  size="lg"
                  alt={t("avatarAlt", { name: displayName })}
                />

                <span className="min-w-0">
                  <span className="text-heading block truncate text-(length:--type-xs) leading-snug font-semibold">
                    {displayName}
                  </span>
                  <span className="text-faint block truncate text-(length:--type-xs) leading-snug">
                    @{user?.username}
                  </span>
                </span>
              </Link>
            )}

            <div className="sheet-group">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                const Icon = NAV_ICONS[link.key];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                    className={active ? "sheet-item sheet-item-on" : "sheet-item"}
                  >
                    <Icon {...ROW_ICON} />
                    {t(link.key)}
                  </Link>
                );
              })}
            </div>

            {isLoggedIn ? (
              <div className="sheet-group">
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className="sheet-item-sub"
                    >
                      <Icon {...ROW_ICON} />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            ) : (
              !loading && (
                <div className="sheet-group">
                  <Link href="/login" onClick={close} className="sheet-item-sub">
                    <LogIn {...ROW_ICON} />
                    {t("login")}
                  </Link>
                  <Link href="/register" onClick={close} className="sheet-item-sub">
                    <UserPlus {...ROW_ICON} />
                    {t("register")}
                  </Link>
                </div>
              )
            )}

            <div className="sheet-group">
              <button onClick={() => setDark(!isDark)} className="sheet-item-sub">
                <ThemeGlyph isDark={isDark} />
                {t("theme")}
                <span className="sheet-value">{isDark ? t("themeDark") : t("themeLight")}</span>
              </button>
              <button
                onClick={() => switchTo(next)}
                disabled={isPending}
                className="sheet-item-sub disabled:opacity-50"
              >
                <LocaleGlyph locale={locale} />
                {t("language")}
                <span className="sheet-value">{LOCALE_LABELS[locale]}</span>
              </button>
            </div>

            {isLoggedIn && (
              <div className="sheet-group">
                <button onClick={handleLogout} className="sheet-item-sub sheet-item-danger">
                  <SquareArrowRightExit {...ROW_ICON} />
                  {t("logout")}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
