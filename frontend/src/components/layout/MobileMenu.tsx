/**
 * @file MobileMenu.tsx
 * @description 移动端折叠菜单 — Client 岛屿
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/config/site';

/**
 * MobileMenu 移动端折叠菜单
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* 移动端菜单切换按钮 */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="菜单"
        aria-expanded={mobileOpen}
        className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading hidden h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 max-md:flex"
      >
        {mobileOpen ? (
          <X size={20} strokeWidth={2.5} className="h-5 w-5" />
        ) : (
          <Menu size={20} strokeWidth={2.5} className="h-5 w-5" />
        )}
      </button>

      {/* 移动端遮罩层 — 通过 portal 渲染到 body，避免被 navbar backdropFilter 影响 */}
      {mounted && mobileOpen &&
        createPortal(
          <div
            className="fixed top-16 bottom-0 left-0 right-0 z-40 md:hidden"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />,
          document.body,
        )}

      {/* 移动端折叠菜单 — 通过 portal 渲染到 body，避免被 navbar backdropFilter 影响 */}
      {mounted &&
        createPortal(
          <div
            ref={mobileMenuRef}
            aria-hidden={!mobileOpen}
            inert={!mobileOpen ? true : undefined}
            style={{
              background: 'var(--color-page)',
            }}
            className={`border-stroke fixed inset-x-0 top-16 z-50 flex flex-col border-b p-4 shadow-lg transition-[transform,opacity] duration-250 ease-out max-md:flex ${
              mobileOpen
                ? 'pointer-events-auto translate-y-0 opacity-100 mobile-menu-open'
                : 'pointer-events-none -translate-y-3 opacity-0'
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
                  className={`nav-item-mobile nav-item-transition nav-item-stagger ${
                    active ? 'nav-link-active' : 'nav-item-inactive'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
