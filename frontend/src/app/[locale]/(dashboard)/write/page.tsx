import "@/app/styles/hljs-theme.css";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { PostData } from "@my-app/shared";
import { requireUserOrRedirect } from "@server/auth/auth.service";
import { getPostServer } from "@server/blog/blog.cache";
import { WriteEditor } from "@/components/dashboard/WriteEditor";

export default async function WritePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await requireUserOrRedirect(locale, `/${locale}/write`);

  const sp = await searchParams;
  const editId = typeof sp.id === "string" ? sp.id : undefined;

  let initialPost: PostData | null = null;

  if (editId) {
    initialPost = await getPostServer(editId).catch(() => null);
  }

  return <WriteEditor editId={editId ?? null} initialPost={initialPost} />;
}
