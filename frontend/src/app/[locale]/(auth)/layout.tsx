/**
 * @file layout.tsx
 * @description 认证路由组（登录/注册）共享布局，提供氛围光晕与主区域容器
 *              已登录用户重定向由 AuthGuard 客户端完成，layout 不调用 cookies() → 可静态缓存
 */

import { AuthGuard } from './_components/AuthGuard';

/**
 * AuthLayout 认证路由组布局，包裹 AuthGuard 鉴权守卫，提供氛围光晕与主区域容器
 * @param props 含 children（路由组页面元素）
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
