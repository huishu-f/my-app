/**
 * @file RouteTransition.tsx
 * @description 路由过渡容器 — pathname 变化时重置 key 触发内容区 remount，
 *              使页面级入场动画（animate-fade-in）在客户端导航时能重新播放。
 *              本身不叠加额外动画：入场动效由各页面路由级区块统一承担，
 *              避免双层 opacity 过渡相乘造成的冗余开销与观感模糊
 *              （设计依据见 styles/animations.css 全局动画规范）。
 */
'use client';

import { usePathname } from 'next/navigation';

/**
 * RouteTransition 路由过渡容器
 * @param props 组件入参，含路由内容区 children
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return <div key={pathname}>{children}</div>;
}
