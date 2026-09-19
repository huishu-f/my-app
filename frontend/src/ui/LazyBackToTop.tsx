/**
 * @file LazyBackToTop.tsx
 * @description 返回顶部按钮的延迟加载外壳：以 next/dynamic（ssr:false）把它移出服务端渲染路径
 */
'use client';

import dynamic from 'next/dynamic';

/** 返回顶部按钮动态导入：纯客户端交互组件，无需服务端渲染 */
const BackToTop = dynamic(() => import('@/ui/BackToTop').then((m) => m.BackToTop), {
  ssr: false,
});

/** 延迟返回顶部按钮外壳（无入参） */
export function LazyBackToTop() {
  return <BackToTop />;
}
