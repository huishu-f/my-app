/**
 * @file layout.tsx
 * @description (auth) 路由组布局：为登录/注册页套 AuthGuard 登录守卫，并加装饰性光晕背景
 */
import { AuthGuard } from './_components/AuthGuard';

/**
 * (auth) 组布局组件
 * @param props children 为 /login 或 /register 页面内容
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="auth-halo" aria-hidden="true" />
      <main className="auth-main">{children}</main>
    </AuthGuard>
  );
}
