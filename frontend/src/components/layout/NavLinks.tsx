/**
 * @file NavLinks.tsx
 * @description 桌面端导航链接 — Client 岛屿，使用 usePathname 高亮当前路由
 */
'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { NAV_LINKS } from '@/config/site';
import { isRouteActive } from '@/lib/navigation';

/**
 * NavLinks 桌面端导航链接，高亮当前路由
 */
export function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  /**
   * 判断导航路由是否处于激活态
   * @param href 导航链接地址
   */
  const isActive = (href: string) => isRouteActive(pathname, href);

  return (
    <div className="flex items-center gap-1.5 max-md:hidden">
      {NAV_LINKS.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`nav-item nav-item-transition relative px-1 leading-7 text-(length:--type-sm) font-medium ${
              active ? 'nav-link-active' : 'nav-item-inactive'
            }`}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </div>
  );
}
