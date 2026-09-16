/**
 * @file layout.tsx
 * @description 应用根布局（透传层）。真正的 <html>/<body> 结构由 [locale]/layout.tsx 接管，
 *              此处仅原样返回 children；Next.js 约定 app/layout.tsx 必须存在。
 *              global-error.tsx 内含自带 html/body 壳，不依赖本文件渲染。
 */

/**
 * RootLayout 根布局组件
 * @param props.children 子路由渲染内容
 * @returns 原样透传的 children
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
