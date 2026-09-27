"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import { NAV_LINKS } from "@/config/site";
import { isRouteActive } from "@/lib/navigation";

function NavPendingMarker() {
  const { pending } = useLinkStatus();
  return <span className="sr-only" data-pending={pending || undefined} />;
}

export function NavLinks() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = (href: string) => isRouteActive(pathname, href);

  return (
    <div className="flex items-center gap-1 max-md:hidden">
      {NAV_LINKS.map((link) => {
        const active = isActive(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={active ? "nav-item nav-item-on" : "nav-item"}
          >
            {t(link.key)}
            <NavPendingMarker />
          </Link>
        );
      })}
    </div>
  );
}
