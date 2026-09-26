"use client";

import { useEffect, useRef, type RefObject } from "react";

interface DismissableOptions {
  lockScroll?: boolean;
}

export function useDismissable(
  open: boolean,
  onClose: () => void,
  refs: RefObject<HTMLElement | null>[],
  options?: DismissableOptions,
) {
  const savedRefs = useRef(refs);
  const savedOnClose = useRef(onClose);

  useEffect(() => {
    savedRefs.current = refs;
    savedOnClose.current = onClose;
  });
  const lockScroll = options?.lockScroll;

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") savedOnClose.current();
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!savedRefs.current.some((r) => r.current?.contains(target))) {
        savedOnClose.current();
      }
    };

    const prevOverflow = lockScroll ? document.body.style.overflow : undefined;
    if (lockScroll) document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      if (lockScroll) document.body.style.overflow = prevOverflow!;
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, lockScroll]);
}
