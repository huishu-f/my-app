/**
 * @file layout.tsx
 * @description 认证路由组（登录/注册）共享布局：提供氛围光晕背景与主区域容器，
 *              并以 AuthGuard 包裹子页面（已登录用户客户端重定向，layout 不调用 cookies()，可静态缓存）。
 */

import { AuthGuard } from './_components/AuthGuard';

/**
 * AuthLayout 认证路由组布局组件
 * @param props.children 路由组页面元素（登录/注册页）
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* 顶部氛围光晕 */}
      <div className="auth-halo" aria-hidden="true" />
      {/* 主区域 */}
      <main className="auth-main">{children}</main>
    </AuthGuard>
  );
}
