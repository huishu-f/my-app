/**
 * @file ThemeToggle.tsx
 * @description 主题切换按钮组件，使用 next-themes 的 useTheme 驱动，带太阳/月亮图标过渡动画
 */
'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/**
 * 客户端环境检测 — 替代传统的 useState(false) + useEffect(setMounted(true)) 模式。
 *
 * useSyncExternalStore 的 getServerSnapshot 在 SSR 时返回 false，
 * hydration 后 getSnapshot 返回 true，实现无闪烁的客户端门控。
 *
 * 注：React 19.3 提供了 use(browser()) 一等 API 来做这件事，
 * 但 Next.js 16.3.5 的编译版 react-dom 尚未导出 browser 函数，
 * 待框架更新后可切换。
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

  const isDark = isBrowser && resolvedTheme === 'dark';

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      onClick={toggle}
      aria-label="切换主题"
      className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-[background-color,color] duration-150"
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
