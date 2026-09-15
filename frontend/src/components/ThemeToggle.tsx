/**
 * @file ThemeToggle.tsx
 * @description 主题切换按钮组件，使用 next-themes 的 useTheme 驱动，带太阳/月亮图标过渡动画
 */
'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/**
 * 客户端环境检测 — useSyncExternalStore 的 getServerSnapshot 在 SSR 时返回 false，
 * hydration 后 getSnapshot 返回 true，实现无闪烁的客户端门控。
 *
 * 注：React 19.3 起 react-dom 已导出 browser()，可改用 use(browser())。
 * 但 browser() 的语义是整个组件退出 SSR —— 按钮将不在初始 HTML 中，
 * JS 加载后才出现，导航栏右侧会产生布局跳动；本按钮需要 SSR 直出，
 * 故保留 useSyncExternalStore 模式（SSR 在场 + 客户端取真值）。
 */
const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

/**
 * ThemeToggle 主题切换按钮
 */
export function ThemeToggle() {
  const isBrowser = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('nav');

  const isDark = isBrowser && resolvedTheme === 'dark';

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      onClick={toggle}
      aria-label={t('themeToggle')}
      className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-[background-color,color] duration-150 ease-out"
    >
      {/* 太阳图标（亮色模式时显示）— span 用 flex 消除行内基线对齐导致的偏移，保证在按钮内绝对居中 */}
      <span
        className={`absolute flex h-5 w-5 items-center justify-center transition-[opacity,transform] duration-300 ease-out ${
          isDark
            ? 'translate-y-4 rotate-90 opacity-0'
            : 'translate-y-0 rotate-0 opacity-100'
        }`}
      >
        <Sun size={20} strokeWidth={2.5} className="h-5 w-5" />
      </span>
      {/* 月亮图标（暗色模式时显示） */}
      <span
        className={`absolute flex h-5 w-5 items-center justify-center transition-[opacity,transform] duration-300 ease-out ${
          isDark
            ? 'translate-y-0 rotate-0 opacity-100'
            : '-translate-y-4 -rotate-90 opacity-0'
        }`}
      >
        <Moon size={20} strokeWidth={2.5} className="h-5 w-5" />
      </span>
    </button>
  );
}
