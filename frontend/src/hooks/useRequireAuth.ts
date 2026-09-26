"use client";
import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { buildLoginRedirect } from "@/lib/navigation";
import type { User } from "@my-app/shared";

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
