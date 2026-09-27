"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/components/AuthProvider";
import { clearAuthStatus } from "@/lib/authStatus";
import { safeRedirect } from "@/lib/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, setMe } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("stale") === "1") {
      setMe(null);
      clearAuthStatus();
      return;
    }

    if (!user) return;

    const raw = new URLSearchParams(window.location.search).get("redirect") || "/";
    const safe = safeRedirect(raw);

    const timer = setTimeout(() => router.replace(safe), 500);
    return () => clearTimeout(timer);
  }, [user, router, setMe]);

  if (user) return null;

  return <>{children}</>;
}
