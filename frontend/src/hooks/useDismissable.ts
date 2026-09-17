/**
 * @file useDismissable.ts
 * @description 浮层/弹层关闭 Hook：监听 ESC 与点击外部关闭、可选锁定背景滚动；通过 ref 判断点击目标是否落在浮层内
 */
'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** useDismissable 的可选配置 */
interface DismissableOptions {
  /** 打开时是否锁定 body 滚动，默认 false */
  lockScroll?: boolean;
}

/**
 * 管理可关闭浮层交互：ESC 关闭、点击浮层外关闭、可选锁定背景滚动
 * @param open 浮层是否打开；false 时不绑定任何监听
 * @param onClose 关闭回调，内部用 ref 保存以始终调用最新闭包
 * @param refs 浮层内容节点引用集合，点击落在这些节点之外即触发关闭
 * @param options 额外选项，见 {@link DismissableOptions}
 */
export function useDismissable(
  open: boolean,
  onClose: () => void,
  refs: RefObject<HTMLElement | null>[],
  options?: DismissableOptions,
) {
  /** 用 ref 持有最新的 refs 与 onClose，避免每次变更重绑监听器 */
  const savedRefs = useRef(refs);
  const savedOnClose = useRef(onClose);
  // render 期间不可写 ref（Concurrent 模式下可能被丢弃），在 effect 中同步最新值
  useEffect(() => {
    savedRefs.current = refs;
    savedOnClose.current = onClose;
  });
  const lockScroll = options?.lockScroll;

  /**
   * 副作用：open 或 lockScroll 变化时重绑监听
   * - keydown：按下 Escape 调用 onClose 关闭浮层
   * - mousedown：点击目标不在任一 ref 内时调用 onClose（点击外部关闭）
   * - lockScroll 为真时锁定 body 滚动，卸载时还原原值并移除监听
   */
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
