/**
 * @file Modal.tsx
 * @description 通用弹窗：遮罩 + 可选标题栏 + 内容区，支持 Esc/点击遮罩关闭、Tab 焦点循环、背景滚动锁定与进出场动画；受控于 open，退场动画播完才从 DOM 卸载
 */
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModalProps } from '@my-app/shared';
import { useDismissable } from '@/hooks/useDismissable';

/** 退场动画时长，单位毫秒；须与 overlay 的 transition-opacity duration-200 保持一致 */
const EXIT_MS = 200;

/**
 * 弹窗内可聚焦元素的查询选择器：Tab 焦点循环的候选集合
 * 排除 tabindex="-1"（面板自身），避免焦点被困在不可见元素上
 */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal 弹窗
 * @param props {@link ModalProps} title 存在时会作为 aria-labelledby 目标（id 由 useId 生成，同屏多弹窗不冲突）；maxWidth 需传 Tailwind 宽度类（如 'max-w-lg'）
 * @example
 * <Modal open={showDelete} onClose={() => setShowDelete(false)} title="确认删除">
 *   <Button variant="danger" onClick={confirm}>删除</Button>
 * </Modal>
 */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-sm' }: ModalProps) {
  /** 弹窗容器 Ref：打开时抢占焦点，同时作为 Tab 焦点循环的可聚焦元素查询根与「点击外部」判定范围 */
  const dialogRef = useRef<HTMLDivElement>(null);
  /** 标题唯一 id：同屏渲染多个弹窗时避免 aria-labelledby 指向重复 id */
  const titleId = useId();
  const t = useTranslations('common');

  /** 是否保留在 DOM 中：关闭后延迟卸载，以便播完退场动画 */
  const [mounted, setMounted] = useState(false);

  /** 退场中标记：切到淡出/缩小动画并屏蔽指针事件，避免退场期间误点 */
  const [exiting, setExiting] = useState(false);

  /**
   * 打开前的焦点持有者；关闭或卸载时把焦点还回去，
   * 否则键盘用户关掉弹窗后焦点落到 body，Tab 会从页面开头重新走
   */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /** 背景滚动锁定：复用浮层通用 Hook，与 MobileMenu 锁滚动策略一致（同一实现，避免两套行为） */
  useDismissable(open, onClose, [dialogRef], { lockScroll: true });

  /**
   * 监听 open/mounted：打开时立刻挂载并清掉退场标记；关闭时先置 exiting 播退场动画，
   * 延迟 EXIT_MS 后再卸载，避免弹窗瞬间消失；期间若重新打开，cleanup 会清掉待执行的卸载定时器
   */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return;
    }
    if (mounted) {
      setExiting(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setExiting(false);
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  /**
   * 监听 open：打开期间挂 keydown 实现 Tab 焦点陷阱——Tab/Shift+Tab 在弹窗内首尾可聚焦元素之间回环；
   * 同时先记录当前焦点（用于关闭后归还）再把焦点抢进弹窗；关闭或卸载时移除监听并归还焦点。
   * 注意 Esc 与点击遮罩关闭由 useDismissable 统一处理，此处不再重复绑定，避免两处各关一次
   */
  useEffect(() => {
    if (!open) return;

    // 记录焦点必须先于下方 focus()，否则记到的会是弹窗面板自己
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      // 只在弹窗容器内查可聚焦元素：Tab 到末尾回到首个，Shift+Tab 到首个绕回末尾
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      // 触发元素可能已随路由卸载，故只在仍挂载于文档时归还焦点
      const el = restoreFocusRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open]);

  // 未打开或退场结束后完全不渲染，遮罩与键盘监听随组件一起卸载
  if (!mounted) return null;

  return (
    // 关闭交互（Esc / 点击遮罩）由 useDismissable 统一接管，遮罩自身不再挂 onClick
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className={`modal-overlay fixed inset-0 z-(--z-modal) flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
        exiting ? 'pointer-events-none opacity-0' : 'animate-fade-in opacity-100'
      }`}
    >
      {/* tabIndex=-1：让面板可被 focus() 抢焦点，但不进入键盘 Tab 序列 */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} border-card-border bg-card-bg rounded-2xl border p-8 shadow-(--shadow-panel) focus:outline-none ${
          exiting ? 'animate-pop-out' : 'animate-pop-in'
        }`}
      >
        {title && (
          <div className="row-md mb-7 justify-between">
            <h3
              id={titleId}
              className="text-heading text-(length:--type-md) leading-normal font-semibold"
            >
              {title}
            </h3>
            <button onClick={onClose} className="icon-btn-ghost" aria-label={t('close')}>
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
