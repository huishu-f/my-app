/**
 * @file ThemeToggle.tsx
 * @description 主题切换按钮：在浅色/深色间切换 next-themes 主题，太阳/月亮图标做位移淡入淡出交叉动画；
 *   同时导出 useThemeMode（状态与切换逻辑）与 ThemeGlyph（单图标），供移动端抽屉的主题行复用
 */
'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/** useSyncExternalStore 的订阅函数：主题变化由 next-themes 自行驱动，此处无需真正订阅，返回空的退订函数 */
const emptySubscribe = () => () => {};
/** 客户端快照：已挂载，可安全判定浏览器环境 */
const isClient = () => true;
/** 服务端快照：用于首帧/SSR，强制按未挂载处理 */
const isServer = () => false;

/** 导航条图标统一尺寸与线宽：18px（h-4.5）+ 2.25 线宽，在一排 36px 方形按钮里重量一致 */
const NAV_ICON = { size: 18, strokeWidth: 2.25, className: 'h-4.5 w-4.5' } as const;

/**
 * 读取深浅主题状态与切换入口
 * @returns isDark 当前是否深色；setDark 直接切到指定档位
 * @description 图标按钮与抽屉主题行共用，避免两处各写一份挂载判定与切换分支
 */
export function useThemeMode() {
  /** 是否运行在浏览器端：用 store 快照读取，避免 SSR 首帧与客户端不一致导致水合错误 */
  const isBrowser = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const { resolvedTheme, setTheme } = useTheme();

  /** 是否深色：未挂载前 isBrowser 为 false，先按浅色渲染，规避 resolvedTheme 在服务端为 undefined 的抖动 */
  const isDark = isBrowser && resolvedTheme === 'dark';

  return { isDark, setDark: (dark: boolean) => setTheme(dark ? 'dark' : 'light') };
}

/**
 * 主题状态图标（单图标静态版）
 * @param isDark 当前是否深色
 * @description 供抽屉主题行这类只需要一个当前态图标的场景使用；按钮内是双图标交叉淡出，不适用
 */
export function ThemeGlyph({ isDark }: { isDark: boolean }) {
  const Icon = isDark ? Moon : Sun;
  return <Icon {...NAV_ICON} />;
}

/**
 * ThemeToggle 主题切换按钮
 */
export function ThemeToggle() {
  const { isDark, setDark } = useThemeMode();
  const t = useTranslations('nav');

  return (
    <button
      onClick={() => setDark(!isDark)}
      aria-label={t('themeToggle')}
      className="icon-btn-ghost relative overflow-hidden"
    >
      {/* 太阳/月亮两个图标绝对定位叠放，靠 opacity+transform 交叉淡入淡出实现切换动画，仅激活项可见 */}
      <span
        className={`absolute flex h-4.5 w-4.5 items-center justify-center transition-[opacity,translate,rotate] duration-300 ease-out ${
          isDark ? 'translate-y-4 rotate-90 opacity-0' : 'translate-y-0 rotate-0 opacity-100'
        }`}
      >
        <Sun {...NAV_ICON} />
      </span>
      <span
        className={`absolute flex h-4.5 w-4.5 items-center justify-center transition-[opacity,translate,rotate] duration-300 ease-out ${
          isDark ? 'translate-y-0 rotate-0 opacity-100' : '-translate-y-4 -rotate-90 opacity-0'
        }`}
      >
        <Moon {...NAV_ICON} />
      </span>
    </button>
  );
}
