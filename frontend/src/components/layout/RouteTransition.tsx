/**
 * @file RouteTransition.tsx
 * @description 路由过渡容器：以 pathname 作为包裹层的 key，令子树在路由切换时重挂载并回放入场动画
 */
'use client';

import { usePathname } from '@/i18n/navigation';

/**
 * 路由过渡容器
 * @param props.children 被包裹的页面内容，随 pathname 变化整体重挂载
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /**
   * key 取 pathname 并非列表用途：pathname 变化会让 React 视为不同元素，
   * 卸载旧 div 并重挂新 div，从而重新触发 CSS 入场动画形成淡入过渡
   */
  return <div key={pathname}>{children}</div>;
}
