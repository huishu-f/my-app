/**
 * @file RouteTransition.tsx
 * @description 路由级淡入过渡 — 监听 pathname 变化，给内容区添加无感知淡入效果。
 *              纯 CSS opacity 过渡，不依赖 framer-motion 等第三方库。
 *              原理：pathname 变化时重置 key 触发 remount，CSS animation 播放 fade-in
 */
'use client';

import { usePathname } from 'next/navigation';

/**
 * RouteTransition 路由过渡容器
 * @param props 组件入参，含路由内容区 children
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="route-fade-in">
      {children}
    </div>
  );
}
