"use client";

import { useEffect } from "react";
import { api } from "@/lib/apiRequest";

const reported = new Set<string>();

const REPORTED_CAP = 50;

export function ViewReporter({ postId }: { postId: string }) {
  useEffect(() => {
    if (!postId || reported.has(postId)) return;

    if (reported.size >= REPORTED_CAP) {
      const oldest = reported.values().next().value;
      if (oldest !== undefined) reported.delete(oldest);
    }
    reported.add(postId);

    api.post<null>(`/posts/${postId}/view`).catch((err) => {
      // 浏览量上报是 best-effort，失败不打扰用户，但留痕便于排查计数丢失。
      console.warn(`[ViewReporter] view report failed for ${postId}`, err);
    });
  }, [postId]);
  return null;
}
