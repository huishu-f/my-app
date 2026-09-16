/**
 * @file Navbar.tsx
 * @description 顶部导航栏 — Server Component 外壳，渲染品牌标识和导航链接
 *              交互部分（用户菜单、移动端菜单）由 Client 岛屿组件承担
 */
import { Link } from '@/i18n/navigation';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { NavLinks } from './NavLinks';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';

/**
 * Navbar 顶部导航栏，Server Component 外壳，静态部分直接渲染，交互部分委托 Client 岛屿
 */
export function Navbar() {
  const t = useTranslations('nav');
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
          {/* 左侧品牌区 — 图标与品牌文字间距收紧（10px），视觉重心更稳 */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-heading group flex items-center gap-2.5 text-(length:--type-base) leading-normal font-medium tracking-[-0.01em]"
            >
              <span className="brand-logo-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                {/* Lucide BookOpen — 与右侧操作图标同规格（20px/2.5）的开放线条 */}
                <BookOpen size={20} strokeWidth={2.5} className="text-heading h-5 w-5" />
              </span>
              <span>{t('brand')}</span>
            </Link>
          </div>

          {/* 右侧功能区 — ml-auto 贴右，统一 4px 节奏收紧：
              组内 gap-1（图标按钮 36px 触达区，视觉间距 ~20px），
              组间 gap-1.5 / PC gap-2，分组仅靠一条弱分割线 + 留白区分，不堆砌线条 */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-1.5">
            {/* 组1：导航（PC 链接 / 移动端汉堡）+ 主题切换 */}
            <div className="flex items-center gap-1">
              <NavLinks />
              <ThemeToggle />
              <MobileMenu />
            </div>
            {/* 分组分隔线 — 实色细竖线（stroke-strong 中灰，明暗主题均清晰可辨） */}
            <div className="bg-stroke-strong h-5 w-px shrink-0" aria-hidden="true" />
            {/* 组2：语言切换；用户区（头像/登录）独立靠右 */}
            <LanguageToggle />
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  );
}
