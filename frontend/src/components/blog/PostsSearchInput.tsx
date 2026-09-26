"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostsSearchInputProps } from "@my-app/shared";

const DEBOUNCE_MS = 300;

export function PostsSearchInput({ initialValue }: PostsSearchInputProps) {
  const t = useTranslations("posts");

  const router = useRouter();

  const searchParams = useSearchParams();

  const [draft, setDraft] = useState<string | null>(null);

  const value = draft ?? initialValue;

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const searchParamsRef = useRef(searchParams);

  if (draft !== null && initialValue.trim() === draft.trim()) setDraft(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (draft === null) return;

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const urlQ = params.get("q") ?? "";
      const next = draft.trim();
      if (next === urlQ) return;
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      const qs = params.toString();

      router.replace(qs ? `/posts?${qs}` : "/posts");
      router.refresh();
    }, DEBOUNCE_MS);
  }, [draft, router]);

  return (
    <div className="relative flex items-center">
      <Search
        size={16}
        strokeWidth={2.5}
        className="text-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      />
      <input
        id="posts-search"
        name="q"
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="border-stroke-strong bg-card-bg text-body placeholder:text-faint input-focus h-10 w-full max-w-50 rounded-md border py-0 pr-9 pl-9 text-(length:--type-xs) leading-normal"
      />
      {value && (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label={t("clearSearch")}
          className="text-faint hover:bg-btn-hover-bg hover:text-heading absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-[var(--duration-fast)]"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
