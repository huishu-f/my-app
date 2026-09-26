"use client";

import { useAuth } from "@/components/AuthProvider";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const tErrors = useTranslations("errors");

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <LoginRequired
        icon={<UserCircle size={20} strokeWidth={2.5} />}
        description={tErrors("dashboardLoginDesc")}
      />
    );
  }

  return <>{children}</>;
}
