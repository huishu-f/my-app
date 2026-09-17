/**
 * @file layout.tsx
 * @description (dashboard) 路由组布局：以 AuthGate 包裹组内所有页面，强制登录校验后方可访问
 */
import { AuthGate } from '@/components/AuthGate';

/**
 * (dashboard) 组布局组件
 * @param props children 为个人中心/设置/写作等已登录页面内容
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
