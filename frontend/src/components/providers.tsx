/**
 * @file providers.tsx
 * @description 客户端 Provider 聚合层，组合 ThemeProvider、AuthProvider 与 Toaster
 */
'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/components/auth-provider';
import type { ProvidersProps } from '@my-app/shared';

/** Toaster 延迟加载 — 不阻塞首屏 hydration */
const Toaster = dynamic(() => import('@/components/ui/toaster').then((m) => m.Toaster), {
  ssr: false,
});

/**
 * Providers 客户端 Provider 聚合
 * - ThemeProvider：明暗主题（next-themes，class 策略，SSR 安全无 FOUC）
 * - AuthProvider：全局登录态（Context + fetch 探测，挂载时按 auth_status cookie 决定是否拉取）
 * - Toaster：全局消息提示（react-hot-toast）
 * @param props {@link ProvidersProps}
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        {/* 全局消息提示 */}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
