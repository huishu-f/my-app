/**
 * @file ProfilePageContent.tsx
 * @description 个人中心内容区（/profile）：左侧用户资料卡（信息/社交链接/统计）+ 右侧文章与收藏标签页；登录态确定后拉取数据
 */
'use client';

import { useEffect, useState } from 'react';
import { MapPin, Globe, Calendar, Users, Check, PenLine } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { StatsGrid } from '@/components/ui/StatsGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { blogApi } from '@/services/blog/api';
import { formatCount, getInitials, formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { Post } from '@my-app/shared';
import { ProfileTabs } from './ProfileTabs';

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
 * 个人中心内容主体（客户端）：需读取 AuthProvider 的登录用户，故不能做成服务端组件
 */
export function ProfilePageContent() {
  /** 当前登录用户与会话加载状态 */
  const { user, loading } = useAuth();

  const t = useTranslations('profile');

  const tCommon = useTranslations('common');

  /** 当前语言，用于加入时间等日期本地化格式化 */
  const locale = useLocale() as Locale;

  /** 我发布的文章（从全部文章按 authorId 本地过滤） */
  const [published, setPublished] = useState<Post[]>([]);

  /** 我的收藏文章列表 */
  const [favorites, setFavorites] = useState<Post[]>([]);

  /** 个人列表数据是否仍在加载 */
  const [dataLoading, setDataLoading] = useState(true);

  /**
   * 监听 user：登录态确定后才拉取「我的文章 + 收藏」
   * 文章列表接口无「仅本人」参数，取前 100 条（单位: 条）后按 authorId 本地过滤；
   * 单个接口失败以空列表兜底，互不影响；cancelled 标记防止组件卸载后 setState
   */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      blogApi.listPosts({ limit: 100 }).catch(() => ({ posts: [] as Post[] })),
      blogApi.listFavorites().catch(() => ({ posts: [] as Post[] })),
    ]).then(([pubData, favData]) => {
      if (cancelled) return;
      setPublished((pubData.posts ?? []).filter((p) => p.authorId === user.id));
      setFavorites(favData.posts ?? []);
      setDataLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  /** 会话未确定（刷新校验 Cookie 中）：先渲染加载占位，避免闪现空资料卡 */
  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <EmptyState
          icon={<UserCircle size={20} strokeWidth={2.5} />}
          title={tCommon('loading')}
          description={tCommon('loadingProfile')}
        />
      </div>
    );
  }

  /** 无头像时 Avatar 展示的姓名首字母 */
  const userInitials = getInitials(user.firstName, user.lastName);

  /** 顶部统计条三项：文章/获赞/浏览，字段缺失按 0 展示 */
  const stats = [
    { label: t('statsArticles'), value: formatCount(user.stats?.articles ?? 0) },
    { label: t('statsLikes'), value: formatCount(user.stats?.likes ?? 0) },
    { label: t('statsViews'), value: formatCount(user.stats?.views ?? 0) },
  ];

  /** 社交账号归一化为完整链接：已带 http 前缀直接用，否则按官方域名拼接；Twitter 输入常带 @ 前缀需剥除 */
  const socialTwitter = user.social?.twitter
    ? user.social.twitter.startsWith('http')
      ? user.social.twitter
      : `https://twitter.com/${user.social.twitter.replace('@', '')}`
    : undefined;

  const socialGithub = user.social?.github
    ? user.social.github.startsWith('http')
      ? user.social.github
      : `https://github.com/${user.social.github}`
    : undefined;

  const socialLinkedin = user.social?.linkedin
    ? user.social.linkedin.startsWith('http')
      ? user.social.linkedin
      : `https://linkedin.com/in/${user.social.linkedin}`
    : undefined;

  /** 任一社交链接存在才渲染图标行 */
  const hasSocial = !!(socialTwitter || socialGithub || socialLinkedin);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[300px_1fr]">
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
                <Button
                  href="/settings"
                  variant="outline"
                  size="md"
                  className="flex-1 lg:flex-none"
                >
                  {t('editProfile')}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <ProfileTabs published={published} favorites={favorites} />
    </div>
  );
}
