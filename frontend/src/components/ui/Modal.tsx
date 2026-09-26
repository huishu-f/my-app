"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ModalProps } from "@my-app/shared";
import { useDismissable } from "@/hooks/useDismissable";

const EXIT_MS = 200;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, maxWidth = "max-w-sm" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const titleId = useId();
  const t = useTranslations("common");

  const [mounted, setMounted] = useState(false);

  const [exiting, setExiting] = useState(false);

  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useDismissable(open, onClose, [dialogRef], { lockScroll: true });

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

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;

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

    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKey);

      const el = restoreFocusRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className={`modal-overlay ease-smooth fixed inset-0 z-(--z-modal) flex items-center justify-center p-4 transition-opacity duration-[var(--duration-fast)] ${
        exiting ? "pointer-events-none opacity-0" : "animate-fade-in opacity-100"
      }`}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} border-card-border bg-card-bg rounded-2xl border p-8 shadow-(--shadow-panel) focus:outline-none ${
          exiting ? "animate-pop-out" : "animate-pop-in"
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
            <button onClick={onClose} className="icon-btn-ghost" aria-label={t("close")}>
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
