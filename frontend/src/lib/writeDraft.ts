import { CATEGORY_VALUES } from "@/lib/category";

export type FormSnapshot = {
  title: string;

  category: string;

  tags: string[];

  content: string;

  coverImage: string;

  summary: string;
};

export const EMPTY_SNAPSHOT: FormSnapshot = {
  title: "",
  category: CATEGORY_VALUES[0],
  tags: [],
  content: "",
  coverImage: "",
  summary: "",
};

export function draftKeyOf(postId: string | null): string {
  return `my-app:write-draft:${postId ?? "new"}`;
}

function isMeaningful(draft: Partial<FormSnapshot> | null): draft is Partial<FormSnapshot> {
  if (!draft) return false;
  return Boolean(
    draft.title || draft.content || draft.summary || draft.coverImage || draft.tags?.length,
  );
}

export function readDraft(key: string): Partial<FormSnapshot> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormSnapshot>;
    return isMeaningful(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistDraft(key: string, snapshot: FormSnapshot): void {
  if (typeof window === "undefined") return;
  const empty =
    !snapshot.title &&
    !snapshot.content &&
    !snapshot.summary &&
    !snapshot.coverImage &&
    snapshot.tags.length === 0;
  try {
    if (empty) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {}
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}
