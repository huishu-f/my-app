/**
 * @file NavLinks.tsx
 * @description 桌面端顶部导航链接列表：渲染全局 NAV_LINKS，按当前路由高亮活动项（md 以上显示）
 */
'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { NAV_LINKS } from '@/config/site';
import { isRouteActive } from '@/lib/navigation';

/**
 * 桌面端导航链接组
 */
export function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  /** 判断导航项是否命中当前路由 */
  const isActive = (href: string) => isRouteActive(pathname, href);

  return (
    <div className="flex items-center gap-1 max-md:hidden">
      {NAV_LINKS.map((link) => {
        const active = isActive(link.href);
        // 活动项用 aria-current="page" 同时驱动高亮样式与无障碍语义
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={active ? 'nav-item nav-item-on' : 'nav-item'}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </div>
  );
}
