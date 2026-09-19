/**
 * @file Container.tsx
 * @description 页面主容器：水平居中 + 最大宽度（max-w-7xl）+ 响应式左右内边距；纯布局无业务语义，需要更窄/更宽时用 className 覆盖 max-w-*
 */
import type { ContainerProps } from '@my-app/shared';

/**
 * Container 页面主容器
 * @param props {@link ContainerProps}
 */
export function Container({ children, className = '' }: ContainerProps) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}
