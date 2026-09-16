/**
 * @file useRafScroll.ts
 * @description 统一 requestAnimationFrame 节流滚动监听 hook
 *              — BackToTop / PostToc 中逐字相同的 ticking flag + rAF 模式
 *              — 传入 rAF 回调接收 scrollY（窗口），返回对象 { scrollY, docHeight }
 */
'use client';

import { useEffect, useRef } from 'react';

/**
 * @param onScroll rAF 节流后的滚动回调，接收当前窗口滚动位置
 */
export function useRafScroll(onScroll: (scrollY: number, docHeight: number) => void) {
  const savedCb = useRef(onScroll);
  savedCb.current = onScroll;

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
    handler(); // 初始调用一次
    return () => window.removeEventListener('scroll', handler);
  }, []);
}
