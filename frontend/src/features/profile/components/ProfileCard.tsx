/**
 * @file ProfileCard.tsx
 * @description 个人中心左侧资料卡（RSC）：头像、姓名、简介、标签、元信息、社交链接与统计；纯展示，无交互故可服务端渲染
 */
import { MapPin, Globe, Calendar, Users, Check, PenLine } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { StatsGrid } from '@/ui/StatsGrid';
import { formatCount, getInitials, formatDate } from '@/lib/format';
import type { Locale } from '@/config/i18n';
import type { User } from '@my-app/shared';

/** Twitter(X) 品牌图标：lucide 不含品牌图标，用内联 SVG 替代 */
function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** GitHub 品牌图标（内联 SVG） */
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5z" />
    </svg>
  );
}

/** LinkedIn 品牌图标（内联 SVG） */
function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/** 位置/网站/加入时间/角色等元信息行图标的统一尺寸样式 */
const META_ICON = 'size-3.5 text-faint';

/**
 * 社交账号归一化为完整链接
 * @param value 用户填写的账号或链接
 * @param build 未带 http 前缀时按官方域名拼接的回调
 * @returns 可点击的完整 URL；未填写时 undefined
 */
function toSocialUrl(value: string | undefined, build: (handle: string) => string) {
  if (!value) return undefined;
  return value.startsWith('http') ? value : build(value);
}

/**
 * 个人中心左侧资料卡（服务端组件）
 * @param props.user 当前登录用户的脱敏信息（由页面服务端解析，无需客户端再取）
 */
export async function ProfileCard({ user }: { user: User }) {
  const t = await getTranslations('profile');

  /** 当前语言，用于加入时间等日期本地化格式化 */
  const locale = (await getLocale()) as Locale;

  /** 无头像时 Avatar 展示的姓名首字母 */
  const userInitials = getInitials(user.firstName, user.lastName);

  /** 顶部统计条三项：文章/获赞/浏览，字段缺失按 0 展示 */
  const stats = [
    { label: t('statsArticles'), value: formatCount(user.stats?.articles ?? 0) },
    { label: t('statsLikes'), value: formatCount(user.stats?.likes ?? 0) },
    { label: t('statsViews'), value: formatCount(user.stats?.views ?? 0) },
  ];

  /** 社交链接：Twitter 输入常带 @ 前缀需剥除 */
  const socialTwitter = toSocialUrl(
    user.social?.twitter,
    (v) => `https://twitter.com/${v.replace('@', '')}`,
  );
  const socialGithub = toSocialUrl(user.social?.github, (v) => `https://github.com/${v}`);
  const socialLinkedin = toSocialUrl(user.social?.linkedin, (v) => `https://linkedin.com/in/${v}`);

  /** 任一社交链接存在才渲染图标行 */
  const hasSocial = !!(socialTwitter || socialGithub || socialLinkedin);

  return (
    <aside className="animate-fade-in">
      <div className="sticky-below-nav">
        <section className="card overflow-hidden shadow-(--shadow-sm)">
          <div className="profile-cover-band h-24 w-full" />
          <div className="px-6 pb-7">
            <div className="-mt-5">
              <Avatar
                initials={userInitials}
                src={user.avatar || undefined}
                size="lg"
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
                    aria-label={t('verified')}
                    title={t('verified')}
                    className="bg-accent text-page inline-flex h-4 w-4 items-center justify-center rounded-full"
                  >
                    <Check size={10} strokeWidth={2.5} />
                  </span>
                )}
              </div>
              <p className="meta-text m-0 mt-1">@{user.username}</p>
            </div>

            <p className="text-body mt-4 text-(length:--type-xs) leading-relaxed">
              {user.bio || t('noBio')}
            </p>

            {user.tags && user.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {user.tags.map((tag) => (
                  <span key={tag} className="chip-outline">
                    {tag}
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
                <span className="row-sm">
                  <Globe className={META_ICON} strokeWidth={2.5} />
                  {user.website}
                </span>
              )}
              {user.joined && (
                <span className="row-sm">
                  <Calendar className={META_ICON} strokeWidth={2.5} />
                  {formatDate(user.joined, locale)}
                </span>
              )}
              <span className="row-sm">
                <Users className={META_ICON} strokeWidth={2.5} />
                {user.role === 'Writer' ? t('roleWriter') : user.role}
                {user.company ? ` · ${user.company}` : ''}
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
                {t('writeArticle')}
              </Button>
              <Button href="/settings" variant="outline" size="md" className="flex-1 lg:flex-none">
                {t('editProfile')}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
