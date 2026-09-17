/**
 * @file providers.tsx
 * @description 应用客户端 Provider 组合根：串联主题（next-themes）、登录态（AuthProvider）与全局提示（Toaster）
 */
'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/components/auth-provider';
import type { ProvidersProps } from '@my-app/shared';

/** 懒加载 Toaster：仅浏览器端交互组件，关闭 SSR 避免服务端渲染无意义的浮层 */
const Toaster = dynamic(() => import('@/components/ui/toaster').then((m) => m.Toaster), {
  ssr: false,
});

/**
 * Providers 全局 Provider 组合
 * @param props {@link ProvidersProps}（类型由 @my-app/shared 提供）
 */
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
