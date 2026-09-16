/**
 * @file 可关闭浮层 Hook
 * @description 统一浮层（下拉菜单、移动端菜单）的关闭交互：
 *              open 为 true 时注册 Escape 键关闭与外部点击关闭监听，可选锁定 body 滚动。
 */
'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** useDismissable 可选配置 */
interface DismissableOptions {
  /** 是否锁定 body 滚动（菜单/模态框场景），关闭时自动恢复 */
  lockScroll?: boolean;
}

/**
 * 浮层关闭交互 Hook
 * @param open 浮层是否展开（false 时不注册任何监听）
 * @param onClose 关闭回调（Escape 键或点击 refs 区域外触发）
 * @param refs 视为"内部"区域的 ref 列表，点击这些区域之外时触发 onClose
 * @param options 可选配置（见 DismissableOptions）
 * @example
 * useDismissable(menuOpen, closeMenu, [menuRef, buttonRef], { lockScroll: true });
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
