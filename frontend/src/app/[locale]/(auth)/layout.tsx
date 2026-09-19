/**
 * @file layout.tsx
 * @description (auth) 路由组布局：为登录/注册页提供装饰性光晕背景与居中主区
 *
 * 登录守卫（AuthGuard）刻意不放在本布局，而由各页面自己包住表单岛。
 * AuthGuard 是客户端组件，会话校验中（loading 为 true）只渲染占位、不渲染 children；
 * 若在此处用它包住整页，整棵子树会被判定为「客户端渲染」而退出静态预渲染
 * （构建产物出现 BAILOUT_TO_CLIENT_SIDE_RENDERING），页壳的标题/说明/切换链接
 * 只会留在 flight payload 里，首屏必须等 JS 才可见。收窄到页面内的表单岛即可让页壳进入静态 HTML。
 */

/**
 * (auth) 组布局组件
 * @param props children 为 /login 或 /register 页面内容
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="auth-halo" aria-hidden="true" />
      <main className="auth-main">{children}</main>
    </>
  );
}
