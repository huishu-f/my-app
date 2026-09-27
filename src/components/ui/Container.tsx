import type { ContainerProps } from "@shared";

export function Container({ children, className = "" }: ContainerProps) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}
