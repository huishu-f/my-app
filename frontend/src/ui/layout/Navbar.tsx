/**
 * @file Navbar.tsx
 * @description 顶部导航栏：吸顶毛玻璃背景。左半区为「品牌 + 站内导航」，右半区为「工具 + 账户」；
 *   工具区在移动端整体隐藏，对应功能收进 MobileMenu 抽屉，故移动端顶栏只剩品牌与菜单开关
 */
import { Link } from '@/i18n/navigation';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { LanguageToggle } from '@/ui/layout/LanguageToggle';
import { NavLinks } from '@/ui/layout/NavLinks';
import { UserMenu } from '@/ui/layout/UserMenu';
import { MobileMenu } from '@/ui/layout/MobileMenu';

/**
 * 顶部导航栏
 */
export function Navbar() {
  const t = useTranslations('nav');
  return (
    <nav className="nav-surface sticky top-0 z-(--z-sticky)">
      {/* gap-6：品牌与导航项之间留出 24px（px）呼吸位，使左侧成为「标识 + 站内目录」一个整体，
          与右侧工具区在视觉上明确分离，中段留白不再像被丢弃的空档 */}
      <div className="mx-auto flex h-(--nav-h) max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="text-heading group flex shrink-0 items-center gap-2 leading-normal whitespace-nowrap sm:gap-2.5"
        >
          <span className="brand-logo-hover text-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <BookOpen size={20} strokeWidth={2.25} className="h-5 w-5" />
          </span>
          {/* 品牌字用衬线：与首页 hero、认证页标题的 display-serif 同源，
              避免同为「站点标识」的地方一处衬线一处无衬线 */}
          <span className="display-serif text-(length:--type-sm) font-semibold">{t('brand')}</span>
        </Link>

        <NavLinks />

        {/* ml-auto 把整组工具推到行尾；组内统一 4px（gap-1）节奏，分隔线额外 mx-1 拉开成 8px 组间断点 */}
        <div className="ml-auto flex items-center gap-1">
          {/* 桌面工具区：主题 / 语言 / 账户。移动端整组隐藏（max-md:hidden），
              对应入口移到 MobileMenu 抽屉里，免得顶栏挤下四个控件加一条分隔线 */}
          <div className="flex items-center gap-1 max-md:hidden">
            <ThemeToggle />
            <LanguageToggle />
            {/* 分隔线把「站点偏好」与「账户」分组：左侧一组是全局工具，右侧是身份相关 */}
            <div className="bg-stroke-strong mx-1 h-5 w-px shrink-0" aria-hidden="true" />
            <UserMenu />
          </div>
          <MobileMenu />
        </div>
      </div>

      {/* 底部装饰分隔线，纯视觉元素故 aria-hidden */}
      <div className="nav-bar-separator" aria-hidden="true" />
    </nav>
  );
}
