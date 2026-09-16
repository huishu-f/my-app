/**
 * @file ArticleCard.tsx
 * @description 文章卡片组件，展示封面、标题、摘要、标签、作者及统计数据，支持跳转链接和附加操作
 */
import { memo } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Eye, Heart } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { CoverFallback } from './ui/CoverFallback';
import { Avatar } from './ui/Avatar';
import { Tag, tagVariantFor } from './ui/Tag';
import { formatCount, formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { CATEGORY_LABEL_KEYS, isKnownCategory } from '@/lib/category';
import { stripHtml, stripMarkdown } from '@/lib/markdown';
import { isSafeImageUrl } from '@/lib/validators';
import type { ArticleCardProps } from '@my-app/shared';

/**
 * ArticleCard 文章卡片
 * @param props {@link ArticleCardProps}
 */
export const ArticleCard = memo(function ArticleCard({
  post,
  href,
  badge,
  tags,
  actions,
  extraStats,
  coverWidth = 'aspect-16/10 w-full sm:aspect-auto sm:w-50',
  className = '',
  variant = 'horizontal',
}: ArticleCardProps) {
  /** 当前语言（日期本地化用） */
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
  /** 文章封面图地址 */
  const coverImage = post.coverImage;

  /** 分类展示名（数据值保持中文原值，仅展示层翻译；未知值原样显示） */
  const categoryLabel = isKnownCategory(post.category)
    ? t(CATEGORY_LABEL_KEYS[post.category])
    : post.category;

  /** 是否为垂直卡片布局 */
  const isVertical = variant === 'vertical';

  /** 封面图区域 */
  const cover = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg ${
        isVertical ? 'aspect-16/10 w-full' : coverWidth
      }`}
    >
      {coverImage && isSafeImageUrl(coverImage) ? (
        <Image
          src={coverImage}
          alt={post.title}
          fill
          sizes={isVertical ? '(max-width: 768px) 100vw, 400px' : '(max-width: 640px) 100vw, 200px'}
          referrerPolicy="no-referrer"
          className="aspect-16/10 w-full rounded-lg object-cover transition-transform duration-300 ease-smooth group-hover:scale-[1.03]"
        />
      ) : (
        <CoverFallback className={isVertical ? 'aspect-16/10 w-full' : 'sm:h-full'} />
      )}
    </div>
  );

  /** 卡片内部内容结构 */
  const card = isVertical ? (
    <div className="flex h-full flex-col gap-4">
      {/* 封面 */}
      {cover}
      {/* 内容 */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* 分类与徽章区域 */}
        <div className="row-sm">
          <span className="text-heading text-(length:--type-xs) leading-normal font-semibold tracking-[0.04em]">
            {categoryLabel}
          </span>
          {badge}
        </div>

        {/* 文章标题 */}
        <h2 className="text-heading line-clamp-2 text-(length:--type-lg) leading-snug font-semibold tracking-[-0.01em]">
          {stripMarkdown(post.title)}
        </h2>

        {/* 文章摘要 */}
        <p className="text-body line-clamp-2 text-(length:--type-base) leading-normal">
          {stripHtml(post.summary)}
        </p>

        {/* 元数据区域 */}
        <div className="meta-text text-faint mt-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1 truncate">
            <Avatar initials={(post.authorName?.charAt(0) || 'U').toUpperCase()} size="xs" />
            {post.authorName}
          </span>
          <span className="meta-dot" aria-hidden="true" />
          <span>{formatDate(post.publishedAt || post.createdAt, locale)}</span>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* 封面 */}
      {cover}
      {/* 内容 */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* 分类与徽章区域 */}
        <div className="row-sm">
          <span className="text-heading text-(length:--type-xs) leading-normal font-semibold tracking-[0.04em]">
            {categoryLabel}
          </span>
          {badge}
        </div>

        {/* 文章标题 */}
        <h2 className="text-heading line-clamp-2 text-(length:--type-2xl) leading-snug font-semibold tracking-[-0.01em]">
          {stripMarkdown(post.title)}
        </h2>

        {/* 文章摘要 */}
        <p className="text-body line-clamp-2 text-(length:--type-base) leading-normal sm:line-clamp-3">
          {stripHtml(post.summary)}
        </p>

        {/* 标签列表区域 */}
        {tags && tags.length > 0 && (
          <div className="relative z-20 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Tag key={t} variant={tagVariantFor(t)} size="sm">
                {t}
              </Tag>
            ))}
          </div>
        )}

        {/* 元数据区域：作者头像+名字、日期、浏览/点赞统计 */}
        <div className="row-sm meta-text text-faint mt-auto flex-wrap">
          <span className="inline-flex items-center gap-2 truncate">
            <Avatar initials={(post.authorName?.charAt(0) || 'U').toUpperCase()} size="xs" />
            {post.authorName}
          </span>
          <span className="meta-dot" aria-hidden="true" />
          <span>{formatDate(post.publishedAt || post.createdAt, locale)}</span>
          <span className="meta-dot" aria-hidden="true" />
          <span className="row-xs">
            <Eye size={12} strokeWidth={2.5} />
            {formatCount(post.views)}
          </span>
          <span className="meta-dot" aria-hidden="true" />
          <span className="row-xs">
            <Heart size={12} strokeWidth={2.5} />
            {formatCount(post.likes)}
          </span>
          {extraStats?.map((s, i) => (
            <span key={`stat-${i}`} className="row-xs">
              <span className="meta-dot" aria-hidden="true" />
              {s.icon}
              {formatCount(s.value)}
            </span>
          ))}
        </div>

        {/* 附加操作区域 */}
        {actions && <div className="row-sm relative z-20 mt-2">{actions}</div>}

        {/* 阅读全文引导 — hover 时强调 */}
        {href && (
          <span className="read-more text-faint group-hover:text-accent mt-2 inline-flex items-center gap-1 text-(length:--type-xs) font-semibold transition-colors duration-150">
            {t('readMore')}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-150 ease-out group-hover:translate-x-[2px]"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  /** 卡片容器class — 不携带入场动画：
   *  卡片复用于列表翻页/筛选/Tab 切换等数据刷新场景，逐卡瀑布入场会在这些场景误播；
   *  路由级入场由列表容器（card-list）统一承担单层 animate-fade-in */
  const baseClass = `group relative card card-hover ${isVertical ? 'p-5' : 'p-6'} ${className}`;

  return (
    <div className={baseClass}>
      {/* 整卡可点击的链接覆盖层 */}
      {href && (
        <Link href={href} className="absolute inset-0 z-10 rounded-xl" aria-label={post.title} />
      )}
      {card}
    </div>
  );
});
