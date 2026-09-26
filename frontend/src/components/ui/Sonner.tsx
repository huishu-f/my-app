"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      duration={3500}
      gap={8}
      className="app-toaster"
      toastOptions={{ className: "app-toast" }}
      {...props}
    />
  );
}
