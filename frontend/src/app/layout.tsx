/**
 * @file layout.tsx — 根布局（pass-through）
 * @description <html>/<body> 移至 [locale]/layout.tsx，此处仅透传 children。
 *              Next.js 要求 app/layout.tsx 存在，但实际布局由 locale 段接管。
 *              global-error.tsx 自带 <html>/<body>，不受此处影响。
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
