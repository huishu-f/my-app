"use client";

import { useAuth } from "@/components/AuthProvider";
import type { User } from "@my-app/shared";

export function useCurrentUser<T extends { id: string } = User>(
  ssrUser?: T | null,
): User | T | null {
  const { user: me } = useAuth();
  return me ?? ssrUser ?? null;
}
