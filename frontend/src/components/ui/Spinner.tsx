const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-[2.5px]",

  lg: "h-8 w-8 border-2",
};

import type { SpinnerProps } from "@my-app/shared";

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      className={`${sizeMap[size]} inline-block animate-spin rounded-full border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}
