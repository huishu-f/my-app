"use client";

import { useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LogIn, NotepadText, SquareArrowRightExit, BookUser, Columns3Cog } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { getInitials } from "@/lib/format";
import { useDismissable } from "@/hooks/useDismissable";
import { useLogoutRedirect } from "@/hooks/useLogoutRedirect";

export const userMenuItems = [
  { href: "/profile", labelKey: "profile", icon: BookUser },
  { href: "/write", labelKey: "write", icon: NotepadText },
  { href: "/settings", labelKey: "settings", icon: Columns3Cog },
] as const;

export function UserMenu() {
  const t = useTranslations("nav");

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  const isLoggedIn = !!user;

  const userMenuRef = useRef<HTMLDivElement>(null);

  const hoverOpenedRef = useRef(false);

  const panelId = useId();

  const displayName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  const initials = getInitials(user?.firstName ?? "", user?.lastName ?? "");

  const handleLogout = useLogoutRedirect(() => setUserMenuOpen(false));

  useDismissable(userMenuOpen, () => setUserMenuOpen(false), [userMenuRef]);

  if (loading && !user) {
    return <span aria-hidden="true" className="h-9 w-9 shrink-0" />;
  }

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="bar-btn">
        <LogIn size={18} strokeWidth={2.25} className="h-4.5 w-4.5 shrink-0" />
        {t("login")}
      </Link>
    );
  }

  return (
    <div
      ref={userMenuRef}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        hoverOpenedRef.current = true;
        setUserMenuOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        hoverOpenedRef.current = false;
        setUserMenuOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setUserMenuOpen(false);
        }
      }}
    >
      <button
        onClick={() => {
          if (hoverOpenedRef.current) {
            hoverOpenedRef.current = false;
            setUserMenuOpen(true);
          } else {
            setUserMenuOpen((v) => !v);
          }
        }}
        aria-label={t("userMenu")}
        aria-expanded={userMenuOpen}
        aria-controls={panelId}
        className="icon-btn-ghost"
      >
        <Avatar
          initials={initials}
          src={user?.avatar || undefined}
          size="sm"
          alt={t("avatarAlt", { name: displayName })}
        />
      </button>

      <div
        className={`absolute top-full right-0 z-(--z-modal) pt-2 ${userMenuOpen ? "" : "pointer-events-none"}`}
      >
        <div
          id={panelId}
          className={`border-card-border bg-card-bg ease-smooth w-56 origin-top-right overflow-hidden rounded-xl border shadow-(--shadow-lg) transition-[opacity,scale,visibility] duration-[var(--duration-fast)] ${
            userMenuOpen ? "visible scale-100 opacity-100" : "invisible scale-98 opacity-0"
          }`}
        >
          <div className="row-sm px-3.5 py-3">
            <Avatar
              initials={initials}
              src={user?.avatar || undefined}
              size="md"
              alt={t("avatarAlt", { name: displayName })}
            />
            <div className="min-w-0">
              <p className="text-heading m-0 truncate text-(length:--type-xs) leading-normal font-semibold">
                {user?.firstName} {user?.lastName}
              </p>

              <p className="text-faint m-0 truncate text-(length:--type-xs) leading-normal">
                @{user?.username}
              </p>
            </div>
          </div>

          <div className="border-stroke/60 mx-3 border-t" />

          <div className="p-1.5">
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setUserMenuOpen(false)}
                  className="row-sm text-body hover:bg-btn-hover-bg hover:text-heading group ease-smooth min-h-9 rounded-md px-2.5 py-2 text-(length:--type-xs) leading-normal font-medium transition-[background-color,color] duration-[var(--duration-fast)]"
                >
                  <Icon
                    size={16}
                    strokeWidth={2.25}
                    className="text-muted group-hover:text-heading ease-smooth h-4 w-4 shrink-0 transition-colors duration-[var(--duration-fast)]"
                  />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="border-stroke/60 mx-3 border-t" />

          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="row-sm text-muted hover:bg-state-error-bg hover:text-state-error group ease-smooth min-h-9 w-full rounded-md px-2.5 py-2 text-(length:--type-xs) leading-normal font-medium transition-[background-color,color] duration-[var(--duration-fast)]"
            >
              <SquareArrowRightExit
                size={16}
                strokeWidth={2.25}
                className="group-hover:text-state-error ease-smooth h-4 w-4 shrink-0 transition-colors duration-[var(--duration-fast)]"
              />
              {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
