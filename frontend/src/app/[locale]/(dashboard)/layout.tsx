/**
 * @file layout.tsx
 * @description dashboard 路由组共享布局 — 客户端鉴权守卫（AuthGate），
 *              不再调用 cookies() → layout 段可静态缓存，认证检查在客户端完成
 */
import { AuthGate } from '@/components/AuthGate';

/**
 * DashboardLayout dashboard 路由组布局
 * 客户端鉴权守卫，未登录渲染 LoginRequired，已登录渲染子页面，可被 ISR/Full Route Cache 缓存
 * @param props 含 children（路由组页面元素）
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}