/**
 * @file PageHeader.tsx
 * @description 页面标题区：标题（字符串或自定义节点）+ 可选副标题 + 右侧操作区；PageHeaderProps 由 @my-app/shared 提供
 */
import type { PageHeaderProps } from '@my-app/shared';

/**
 * 页面标题区
 * @param props {@link PageHeaderProps}
 */
export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    // actions 存在时追加 page-actions，使标题与操作区两端对齐
    <header
      className={`page-header animate-fade-in ${actions ? 'page-actions' : ''} ${className}`.trim()}
    >
      {/* 标题为字符串时渲染标准 h1，否则直接渲染调用方传入的自定义标题节点 */}
      <div>
        {typeof title === 'string' ? (
          <h1 className="page-title max-md:page-title-mobile">{title}</h1>
        ) : (
          title
        )}
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
