"use client";

import { useCurrentUser } from "./useCurrentUser";
import { usePostState, type PostStateValue } from "@/components/blog/PostStateProvider";
import { useRequireAuth } from "./useRequireAuth";
import { postPath } from "@my-app/shared";
import type { User } from "@my-app/shared";

interface PostPageAuthContext extends PostStateValue {
  user: User | null;

  requireAuth: (action: () => void) => void;
}

export function usePostPageAuth(postId: string, ssrUser?: User | null): PostPageAuthContext {
  const user = useCurrentUser(ssrUser);
  const { post, updatePost } = usePostState();
  const requireAuth = useRequireAuth(user, postPath(postId));

  return { user, post, updatePost, requireAuth };
}
