/**
 * @file layout.tsx
 * @description dashboard 路由组共享布局：以客户端 AuthGate 守卫包裹子页面
 *              （未登录渲染登录提示），layout 不调用 cookies()，段内可静态缓存。
 */
import { AuthGate } from '@/components/AuthGate';

/**
 * DashboardLayout dashboard 路由组布局组件
 * @param props.children 路由组页面元素（write/settings/profile）
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}