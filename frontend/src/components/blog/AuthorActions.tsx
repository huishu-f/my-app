"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DeletePostButton } from "./DeletePostButton";

export function AuthorActions({
  postId,
  authorId,
  ssrUser,
}: {
  postId: string;

  authorId?: string;

  ssrUser?: { id: string } | null;
}) {
  const user = useCurrentUser(ssrUser);

  if (!user || !authorId || user.id !== authorId) return null;

  return <DeletePostButton postId={postId} variant="full" redirectTo="/posts" />;
}
