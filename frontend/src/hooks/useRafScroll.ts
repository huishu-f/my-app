/**
 * @file useRafScroll.ts
 * @description 基于 requestAnimationFrame 节流的滚动监听 Hook：滚动时按帧回调纵向滚动距离与文档可滚动高度
 */
'use client';

import { useEffect, useRef } from 'react';

/**
 * 订阅 window 滚动并用 requestAnimationFrame 节流后回调
 * @param onScroll 每帧回调；参数为纵向滚动距离 scrollY（px）与文档可滚动高度 docHeight（px，已减去视口高度）。内部用 ref 持有，始终调用最新闭包
 * @example
 * useRafScroll((scrollY, docHeight) => setProgress(scrollY / docHeight));
 */
export function useRafScroll(onScroll: (scrollY: number, docHeight: number) => void) {
  /** 用 ref 持有最新回调，避免频繁重绑 scroll 监听 */
  const savedCb = useRef(onScroll);
  // render 期间不可写 ref（Concurrent 模式下可能被丢弃），在 effect 中同步最新值
  useEffect(() => {
    savedCb.current = onScroll;
  });

  /**
   * 副作用：仅挂载时绑定一次 scroll 监听，卸载时移除
   * - ticking 标志 + requestAnimationFrame 把高频滚动节流到每帧一次
   * - docHeight = 文档总高 - 视口高，即最大可滚动距离（px）
   * - 绑定后立即触发一次 handler，同步初始滚动状态
   */
  useEffect(() => {
    let ticking = false;

    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        savedCb.current(window.scrollY, document.documentElement.scrollHeight - window.innerHeight);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);
}
