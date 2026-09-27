"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { buildLoginRedirect } from "@/lib/navigation";

interface LoginRequiredProps {
  icon: ReactNode;

  description: string;
}

export function LoginRequired({ icon, description }: LoginRequiredProps) {
  const pathname = usePathname() || "/";
  const t = useTranslations("common");
  return (
    <Container className="page-section">
      <EmptyState
        icon={icon}
        title={t("loginRequired")}
        description={description}
        action={<Button href={buildLoginRedirect(pathname)}>{t("goLogin")}</Button>}
      />
    </Container>
  );
}
