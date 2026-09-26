"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import type { ProvidersProps } from "@my-app/shared";

const Toaster = dynamic(() => import("@/components/ui/Sonner").then((m) => m.Toaster), {
  ssr: false,
});

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
