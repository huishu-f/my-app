/**
 * @file MobileMenu.tsx
 * @description 移动端折叠菜单 — Client 岛屿
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePathname } from '@/i18n/navigation';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NAV_LINKS } from '@/config/site';

/**
 * MobileMenu 移动端折叠菜单
 */
export function MobileMenu() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  /** 切换按钮 Ref — 用于外部点击判定时排除按钮自身 */
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // 点击面板或切换按钮（X）内部时不在此处关闭：
      // 若不排除按钮，mousedown 先触发"外部点击关闭"、随后按钮 click 再翻转打开，
      // 一关一开相互抵消，表现为"点 X 关不掉菜单"（开关统一由按钮 onClick 处理）
      const insideMenu = mobileMenuRef.current?.contains(target);
      const insideToggle = toggleRef.current?.contains(target);
      if (!insideMenu && !insideToggle) {
        setMobileOpen(false);
      }
    };

    // 菜单打开期间锁定 body 滚动，防止触摸遮罩时"滚动穿透"
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* 移动端菜单切换按钮 — 图标切换复用 ThemeToggle 的 transform/opacity 过渡语言 */}
      <button
        ref={toggleRef}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
        aria-expanded={mobileOpen}
        className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading relative hidden h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-[background-color,color] duration-150 ease-out max-md:flex"
      >
        {/* 汉堡图标（菜单关闭时显示） */}
        <span
          className={`absolute flex h-5 w-5 items-center justify-center transition-[opacity,transform] duration-300 ease-out ${
            mobileOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
          }`}
        >
          <Menu size={20} strokeWidth={2.5} className="h-5 w-5" />
        </span>
        {/* 关闭图标（菜单打开时显示） */}
        <span
          className={`absolute flex h-5 w-5 items-center justify-center transition-[opacity,transform] duration-300 ease-out ${
            mobileOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
          }`}
        >
          <X size={20} strokeWidth={2.5} className="h-5 w-5" />
        </span>
      </button>

      {/* 移动端遮罩层 — 通过 portal 渲染到 body，复用 modal-overlay 令牌（accent 混色 + 模糊）
          常挂载 + opacity 双向过渡，与面板 200ms 同档（全局动画规范）
          隐藏态叠加 invisible：opacity-0 时 backdrop-filter 仍会模糊背后内容，须靠 visibility 彻底关闭渲染 */}
      {mounted &&
        createPortal(
          <div
            className={`modal-overlay fixed top-16 right-0 bottom-0 left-0 z-40 transition-[opacity,visibility] duration-200 ease-out md:hidden ${
              mobileOpen
                ? 'pointer-events-auto visible opacity-100'
                : 'pointer-events-none invisible opacity-0'
            }`}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />,
          document.body,
        )}

      {/* 移动端折叠菜单 — 通过 portal 渲染到 body，避免被 navbar backdropFilter 影响
          常挂载 + transform/opacity 双向过渡（200ms 档，smooth 曲线） */}
      {mounted &&
        createPortal(
          <div
            ref={mobileMenuRef}
            aria-hidden={!mobileOpen}
            inert={!mobileOpen ? true : undefined}
            style={{
              background: 'var(--color-page)',
            }}
            className={`border-stroke fixed inset-x-0 top-16 z-50 flex flex-col border-b p-4 shadow-lg transition-[opacity,visibility] duration-200 ease-out max-md:flex ${
              mobileOpen
                ? 'visible pointer-events-auto opacity-100'
                : 'invisible pointer-events-none opacity-0'
            }`}
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-item-mobile nav-item-transition ${
                    active ? 'nav-link-active' : 'nav-item-inactive'
                  }`}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
