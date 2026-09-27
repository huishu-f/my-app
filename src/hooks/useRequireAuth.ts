"use client";
import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { buildLoginRedirect } from "@/lib/url";
import type { User } from "@shared";

export function useRequireAuth(user: User | null, redirectPath: string) {
  const router = useRouter();

  return useCallback(
    (action: () => void) => {
      if (!user) {
        router.push(buildLoginRedirect(redirectPath));
        return;
      }
      action();
    },
    [user, redirectPath, router],
  );
}
