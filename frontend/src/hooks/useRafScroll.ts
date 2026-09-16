/**
 * @file rAF 节流滚动监听 Hook
 * @description 统一 requestAnimationFrame 节流的滚动监听封装，
 *              收敛返回顶部、文章目录等组件重复的 ticking flag + rAF 模式。
 *              仅在客户端生效，监听窗口滚动并支持 passive 模式。
 */
'use client';

import { useEffect, useRef } from 'react';

/**
 * rAF 节流滚动监听 Hook
 * @param onScroll rAF 节流后的滚动回调，接收当前窗口滚动位置与剩余可滚动高度
 * @returns 无返回值（通过回调消费滚动数据）
 * @description 每帧最多触发一次回调；挂载时立即回调一次以同步初始位置
 * @example
 * useRafScroll((scrollY, docHeight) => setShow(scrollY > 400));
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
