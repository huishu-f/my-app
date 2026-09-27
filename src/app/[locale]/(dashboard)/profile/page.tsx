import { Container } from "@/components/ui/Container";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { requireUserOrRedirect } from "@server/auth/auth.service";
import {
  listPostsByAuthorServer,
  listFavoritePostsServer,
  listDraftsServer,
} from "@server/blog/blog.cache";
import { ProfilePageContent } from "@/components/dashboard/ProfilePageContent";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("profile");
  const currentLocale = (await getLocale()) as Locale;

  const user = await requireUserOrRedirect(locale, `/${locale}/profile`);

  const [published, favoritesData, draftsData] = await Promise.all([
    listPostsByAuthorServer(user.id).catch(() => []),
    listFavoritePostsServer().catch(() => ({ posts: [] })),
    listDraftsServer().catch(() => ({ posts: [] })),
  ]);

  const favorites = favoritesData.posts ?? [];
  const drafts = draftsData.posts ?? [];

  return (
    <Container className="page-section">
      <ProfilePageContent
        user={user}
        published={published}
        favorites={favorites}
        drafts={drafts}
        locale={currentLocale}
        t={t}
      />
    </Container>
  );
}
