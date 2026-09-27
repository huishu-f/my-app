"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

const emptySubscribe = () => () => {};

const isClient = () => true;

const isServer = () => false;

const NAV_ICON = { size: 18, strokeWidth: 2.25, className: "h-4.5 w-4.5" } as const;

export function useThemeMode() {
  const isBrowser = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = isBrowser && resolvedTheme === "dark";

  return { isDark, setDark: (dark: boolean) => setTheme(dark ? "dark" : "light") };
}

export function ThemeGlyph({ isDark }: { isDark: boolean }) {
  const Icon = isDark ? Moon : Sun;
  return <Icon {...NAV_ICON} />;
}

export function ThemeToggle() {
  const { isDark, setDark } = useThemeMode();
  const t = useTranslations("nav");

  return (
    <button
      onClick={() => setDark(!isDark)}
      aria-label={t("themeToggle")}
      className="icon-btn-ghost relative overflow-hidden"
    >
      <span
        className={`ease-smooth absolute flex h-4.5 w-4.5 items-center justify-center transition-[opacity,translate,rotate] duration-[var(--duration-slow)] ${
          isDark ? "translate-y-4 rotate-90 opacity-0" : "translate-y-0 rotate-0 opacity-100"
        }`}
      >
        <Sun {...NAV_ICON} />
      </span>
      <span
        className={`ease-smooth absolute flex h-4.5 w-4.5 items-center justify-center transition-[opacity,translate,rotate] duration-[var(--duration-slow)] ${
          isDark ? "translate-y-0 rotate-0 opacity-100" : "-translate-y-4 -rotate-90 opacity-0"
        }`}
      >
        <Moon {...NAV_ICON} />
      </span>
    </button>
  );
}
