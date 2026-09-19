/**
 * @file layout.tsx
 * @description App Router 必需的根布局：纯透传 children，不渲染 <html>/<body>；文档根节点由 [locale]/layout.tsx 输出，以便 lang 与主题类随语言切换。根级 not-found.tsx / global-error.tsx 因脱离该布局，需自带完整 <html> 结构
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 保持空壳：在此渲染 <html> 会与 [locale] 布局的文档根节点冲突，导致语言属性无法生效
  return children;
}
