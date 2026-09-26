"use client";

import { useRouter } from "@/i18n/navigation";
import { msg } from "@/lib/message";
import { notify } from "@/lib/toast";
import { useLogout } from "@/hooks/useAuth";

export function useLogoutRedirect(onBeforeLeave: () => void) {
  const router = useRouter();
  const logoutMutation = useLogout();

  return () => {
    onBeforeLeave();
    router.replace("/");
    logoutMutation.mutate(undefined, {
      onSuccess: () => notify.success(msg("session", "loggedOut")),
      onError: () => notify.fail(msg("session", "logoutFailed")),
    });
  };
}
