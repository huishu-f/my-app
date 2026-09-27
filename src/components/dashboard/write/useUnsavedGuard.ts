"use client";

import { useState } from "react";

export function useUnsavedGuard(isDirty: boolean): {
  confirmOpen: boolean;

  setConfirmOpen: (open: boolean) => void;

  guard: (proceed: () => void) => void;
} {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const guard = (proceed: () => void) => {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    proceed();
  };

  return { confirmOpen, setConfirmOpen, guard };
}
