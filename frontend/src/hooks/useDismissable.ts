/**
 * @file useDismissable.ts
 * @description 统一 Escape 键 + 外部点击关闭逻辑，消除 MobileMenu / UserMenu 重复的 useEffect
 *              — open 为 true 时注册 keydown(Escape) + mousedown(外部点击) 监听
 *              — 可选 lockScroll 锁定 body 滚动（菜单/模态场景）
 *              — refs 数组指定"内部"区域，点击这些区域不触发关闭
 */
'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** useDismissable 可选配置 */
interface DismissableOptions {
  /** 锁定 body 滚动（菜单/模态框场景） */
  lockScroll?: boolean;
}

/**
 * @param open 是否展开（false 时不注册任何监听）
 * @param onClose 关闭回调
 * @param refs "内部"区域 ref 列表，点击这些区域外部时触发 onClose
 * @param options 可选配置
 */
export function useDismissable(
  open: boolean,
  onClose: () => void,
  refs: RefObject<HTMLElement | null>[],
  options?: DismissableOptions,
) {
  // ponytail: refs/onClose 存入 ref 避免数组/闭包重建触发 effect 重跑
  const savedRefs = useRef(refs);
  savedRefs.current = refs;
  const savedOnClose = useRef(onClose);
  savedOnClose.current = onClose;
  const lockScroll = options?.lockScroll;

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') savedOnClose.current();
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!savedRefs.current.some((r) => r.current?.contains(target))) {
        savedOnClose.current();
      }
    };

    const prevOverflow = lockScroll ? document.body.style.overflow : undefined;
    if (lockScroll) document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      if (lockScroll) document.body.style.overflow = prevOverflow!;
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, lockScroll]);
}
