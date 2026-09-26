import type { ContainerProps } from "@my-app/shared";

export function Container({ children, className = "" }: ContainerProps) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}
