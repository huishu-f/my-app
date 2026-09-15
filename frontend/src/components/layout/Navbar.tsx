/**
 * @file Navbar.tsx
 * @description 顶部导航栏 — Server Component 外壳，渲染品牌标识和导航链接
 *              交互部分（用户菜单、移动端菜单）由 Client 岛屿组件承担
 */
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { NavLinks } from './NavLinks';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';

/**
 * Navbar 顶部导航栏，Server Component 外壳，静态部分直接渲染，交互部分委托 Client 岛屿
 */
export function Navbar() {
  return (
    <>
      {/* 导航栏主体 */}
      <nav
        className="border-stroke sticky top-0 z-40 border-b"
        style={{
          background: 'color-mix(in srgb, var(--color-page) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* 底部渐变分隔线 — 模拟光线漫反射，增加层次 */}
        <div className="nav-bar-separator" aria-hidden="true" />
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          {/* 左侧品牌区 */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="row-md text-heading group text-(length:--type-base) leading-normal font-medium tracking-[-0.01em]"
            >
              <span className="brand-logo-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                {/* Lucide BookOpen — 与右侧操作图标同规格（20px/2.5）的开放线条 */}
                <BookOpen size={20} strokeWidth={2.5} className="text-heading h-5 w-5" />
              </span>
              <span>我的博客</span>
            </Link>
          </div>

          {/* 右侧功能区：菜单 + 操作区 — ml-auto 始终贴右边缘 */}
          <div className="ml-auto flex items-center gap-3">
            <NavLinks />
            <ThemeToggle />
            <UserMenu />
            <MobileMenu />
          </div>
        </div>
      </nav>
    </>
  );
}
