"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRafScroll } from "@/hooks/useRafScroll";

export function BackToTop() {
  const t = useTranslations("common");

  const [visible, setVisible] = useState(false);

  useRafScroll((scrollY) => setVisible(scrollY > 400));

  return (
    <div
      className={`ease-smooth fixed bottom-6 left-6 z-(--z-sticky) transition-[opacity,visibility] duration-[var(--duration-fast)] max-md:bottom-4 max-md:left-4 ${
        visible ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
      }`}
    >
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t("backToTop")}
        tabIndex={visible ? 0 : -1}
        className="border-stroke bg-card-bg text-heading hover:bg-btn-hover-bg ease-smooth flex h-11 w-11 items-center justify-center rounded-full border shadow-(--shadow-md) transition-[background-color,box-shadow] duration-[var(--duration-fast)] hover:shadow-(--shadow-lg) max-md:h-10 max-md:w-10"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
