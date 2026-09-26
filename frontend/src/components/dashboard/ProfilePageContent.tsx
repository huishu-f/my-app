import { MapPin, Globe, Calendar, Users, Check, PenLine, UserPen } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StatsGrid } from "@/components/ui/StatsGrid";
import type { Locale } from "@/i18n/config";
import { getInitials, formatCount, formatDate } from "@/lib/format";
import type { Post, User } from "@my-app/shared";
import { ProfileTabs } from "./ProfileTabs";

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

const META_ICON = "size-3.5 text-faint";

export function ProfilePageContent({
  user,
  published,
  favorites,
  drafts,
  locale,
  t,
}: {
  user: User;
  published: Post[];
  favorites: Post[];
  drafts: Post[];
  locale: Locale;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, values?: any) => string;
}) {
  const userInitials = getInitials(user.firstName, user.lastName);

  const stats = [
    { label: t("statsArticles"), value: formatCount(user.stats?.articles ?? 0) },
    { label: t("statsLikes"), value: formatCount(user.stats?.likes ?? 0) },
    { label: t("statsViews"), value: formatCount(user.stats?.views ?? 0) },
  ];

  const socialTwitter = user.social?.twitter
    ? user.social.twitter.startsWith("http")
      ? user.social.twitter
      : `https://twitter.com/${user.social.twitter.replace("@", "")}`
    : undefined;

  const socialGithub = user.social?.github
    ? user.social.github.startsWith("http")
      ? user.social.github
      : `https://github.com/${user.social.github}`
    : undefined;

  const socialLinkedin = user.social?.linkedin
    ? user.social.linkedin.startsWith("http")
      ? user.social.linkedin
      : `https://linkedin.com/in/${user.social.linkedin}`
    : undefined;

  const hasSocial = !!(socialTwitter || socialGithub || socialLinkedin);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
      <aside className="animate-fade-in">
        <div className="sticky-below-nav max-lg:static">
          <section className="card overflow-hidden shadow-(--shadow-sm)">
            <div className="profile-cover-band h-24 w-full" />
            <div className="px-6 pb-7">
              <div className="-mt-5">
                <Avatar
                  size="lg"
                  src={user.avatar || undefined}
                  alt={`${user.firstName} ${user.lastName}`}
                  initials={userInitials}
                  className="border-card-bg border-4"
                />
              </div>

              <div className="mt-5">
                <div className="row-sm flex-wrap">
                  <h1 className="text-heading m-0 text-(length:--type-md) leading-tight font-bold tracking-[-0.02em]">
                    {user.firstName} {user.lastName}
                  </h1>
                  {user.verified && (
                    <span
                      role="img"
                      aria-label={t("verified")}
                      title={t("verified")}
                      className="bg-accent text-page inline-flex h-4 w-4 items-center justify-center rounded-full"
                    >
                      <Check size={10} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <p className="meta-text m-0 mt-1">@{user.username}</p>
              </div>

              <p className="text-body mt-4 text-(length:--type-xs) leading-relaxed">
                {user.bio || t("noBio")}
              </p>

              {user.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {user.tags.map((t) => (
                    <span key={t} className="chip-outline">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-body mt-5 space-y-2 text-(length:--type-2xs) leading-normal">
                {user.location && (
                  <span className="row-sm">
                    <MapPin className={META_ICON} strokeWidth={2.5} />
                    {user.location}
                  </span>
                )}
                {user.website && (
                  <a
                    href={
                      user.website.startsWith("http") ? user.website : `https://${user.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="row-sm hover:text-heading transition-colors"
                  >
                    <Globe className={META_ICON} strokeWidth={2.5} />
                    {user.website}
                  </a>
                )}
                {user.joined && (
                  <span className="row-sm">
                    <Calendar className={META_ICON} strokeWidth={2.5} />
                    {formatDate(user.joined, locale)}
                  </span>
                )}
                <span className="row-sm">
                  <Users className={META_ICON} strokeWidth={2.5} />

                  {user.role === "Writer" ? t("roleWriter") : user.role}
                  {user.company ? ` · ${user.company}` : ""}
                </span>
              </div>

              {hasSocial && (
                <div className="row-sm mt-5">
                  {socialTwitter && (
                    <a
                      href={socialTwitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Twitter"
                      className="icon-btn"
                    >
                      <TwitterIcon />
                    </a>
                  )}
                  {socialGithub && (
                    <a
                      href={socialGithub}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                      className="icon-btn"
                    >
                      <GithubIcon />
                    </a>
                  )}
                  {socialLinkedin && (
                    <a
                      href={socialLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="icon-btn"
                    >
                      <LinkedinIcon />
                    </a>
                  )}
                </div>
              )}

              <div className="border-stroke mt-6 border-t pt-6">
                <StatsGrid items={stats} />
              </div>

              <div className="row-md mt-6">
                <Button href="/write" size="md" className="flex-1">
                  <PenLine size={16} strokeWidth={2.5} />
                  {t("writeArticle")}
                </Button>
                <Button href="/settings" variant="outline" size="md" className="flex-1">
                  <UserPen size={16} strokeWidth={2.5} />
                  {t("editProfile")}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <ProfileTabs published={published} favorites={favorites} drafts={drafts} />
    </div>
  );
}
