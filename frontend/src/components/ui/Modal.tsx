/**
 * @file Modal.tsx
 * @description 通用模态弹窗组件，支持 Escape 关闭、点击遮罩关闭、焦点管理和标题展示
 *              进出场对称：面板 pop-in/pop-out（200ms 档，全局动画规范），
 *              关闭时先播出场动画再卸载，遮罩同步淡出
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModalProps } from '@my-app/shared';

/** 出场动画时长，与 pop-out 关键帧一致（styles/animations.css） */
const EXIT_MS = 200;

/**
 * Modal 模态弹窗
 * @param props {@link ModalProps}
 */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-sm' }: ModalProps) {
  /**
   * 弹窗内容容器 Ref，用于打开时聚焦
   */
  const dialogRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('common');

  /** 是否已挂载（打开过且出场动画尚未完成） */
  const [mounted, setMounted] = useState(false);
  /** 是否处于出场中 */
  const [exiting, setExiting] = useState(false);

  /**
   * 挂载/卸载编排：open 置真立即挂载并播入场动画；
   * 置假时先进入 exiting 态播出场动画，EXIT_MS 后真正卸载。
   * 出场期间重新打开会取消卸载定时器并重播入场。
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
   * 弹窗打开时注册 Escape 键监听并聚焦弹窗容器，
   * 关闭时移除监听
   */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // 焦点陷阱：Tab / Shift+Tab 循环在弹窗内
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
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
      }
    };
    document.addEventListener('keydown', handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className={`modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
        exiting ? 'pointer-events-none opacity-0' : 'animate-fade-in opacity-100'
      }`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} border-card-border bg-card-bg rounded-2xl border p-8 shadow-lg focus:outline-none ${
          exiting ? 'animate-pop-out' : 'animate-pop-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏与关闭按钮 */}
        {title && (
          <div className="row-md mb-7 justify-between">
            <h3
              id="modal-title"
              className="text-heading text-(length:--type-xl) leading-normal font-semibold"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-faint hover:bg-stroke hover:text-heading inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 ease-out"
              aria-label={t('close')}
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {/* 弹窗内容区域 */}
        {children}
      </div>
    </div>
  );
}
