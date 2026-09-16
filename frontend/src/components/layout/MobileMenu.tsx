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
import { isRouteActive } from '@/lib/navigation';
import { useDismissable } from '@/hooks/useDismissable';

/**
 * MobileMenu 移动端折叠菜单
 */
export function MobileMenu() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  /** 移动端菜单展开状态 */
  const [mobileOpen, setMobileOpen] = useState(false);
  /** 客户端挂载标记 — portal 依赖 document，需挂载后渲染 */
  const [mounted, setMounted] = useState(false);
  /** 菜单面板 Ref — 供 useDismissable 外部点击判定 */
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  /** 切换按钮 Ref — 用于外部点击判定时排除按钮自身 */
  const toggleRef = useRef<HTMLButtonElement>(null);

  /**
   * 判断导航路由是否处于激活态
   * @param href 导航链接地址
   */
  const isActive = (href: string) => isRouteActive(pathname, href);

  /** 挂载后标记 mounted，允许 portal 渲染 */
  useEffect(() => {
    setMounted(true);
  }, []);

  useDismissable(mobileOpen, () => setMobileOpen(false), [mobileMenuRef, toggleRef], {
    lockScroll: true,
  });

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
