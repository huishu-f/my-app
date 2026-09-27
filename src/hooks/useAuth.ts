"use client";

import { useCallback } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAuth } from "@/components/AuthProvider";
import { clearAuthStatus } from "@/lib/authStatus";
import { logoutAction } from "@server/auth/auth.controller";

export function useLogout() {
  const { setMe } = useAuth();
  const action = useCallback(async () => {
    try {
      await logoutAction();
    } finally {
      clearAuthStatus();
      setMe(null);
    }
    return null;
  }, [setMe]);
  return useAsyncAction<void, null>(action);
}
