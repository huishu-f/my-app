import { ImageIcon } from "lucide-react";
import type { CoverFallbackProps } from "@my-app/shared";

export function CoverFallback({ className = "" }: CoverFallbackProps) {
  return (
    <div
      className={`cover-fallback text-muted flex aspect-16/10 w-full items-center justify-center rounded-md ${className}`}
    >
      <ImageIcon size={28} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
