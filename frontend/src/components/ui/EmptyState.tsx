/**
 * @file EmptyState.tsx
 * @description 空状态卡片：图标 + 标题 + 可选描述与操作区，用于列表无数据/搜索无结果；icon、title 必传，操作按钮由调用方注入以自带跳转与权限逻辑
 */
import type { EmptyStateProps } from '@my-app/shared';

/**
 * EmptyState 空状态
 * @param props {@link EmptyStateProps}
 * @example
 * <EmptyState
 *   icon={<FileText size={20} strokeWidth={2.5} />}
 *   title={t('noArticlesTitle')}
 *   description={t('noArticlesDesc')}
 *   action={<Button href="/write">新建文章</Button>}
 * />
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`border-stroke bg-surface rounded-xl border px-6 py-10 text-center ${className}`}
    >
      <div className="bg-card-bg text-faint mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <p className="text-heading mb-1.5 text-(length:--type-base) leading-normal font-semibold">
        {title}
      </p>
      {description && (
        <p className="text-muted mx-auto max-w-75 text-(length:--type-xs) leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
