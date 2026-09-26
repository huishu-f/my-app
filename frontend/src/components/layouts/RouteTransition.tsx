"use client";

import { usePathname } from "@/i18n/navigation";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return <div key={pathname}>{children}</div>;
}
