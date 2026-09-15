/**
 * @file NavLinks.tsx
 * @description 桌面端导航链接 — Client 岛屿，使用 usePathname 高亮当前路由
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NAV_LINKS } from '@/config/site';

/**
 * NavLinks 桌面端导航链接，高亮当前路由
 */
export function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

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
