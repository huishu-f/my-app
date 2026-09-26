"use client";

import { useEffect, useRef } from "react";

export function useRafScroll(onScroll: (scrollY: number, docHeight: number) => void) {
  const savedCb = useRef(onScroll);

  useEffect(() => {
    savedCb.current = onScroll;
  });

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

    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);
}
