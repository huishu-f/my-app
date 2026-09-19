/**
 * @file page.tsx
 * @description /[locale] 段的兜底（catch-all）路由：该语言下所有未匹配到具体页面的剩余路径都命中这里，不渲染任何内容，直接转 404
 */
import { notFound } from 'next/navigation';

/**
 * 直接抛 notFound()：把渲染权交给 [locale]/not-found.tsx（保留布局与语言），同时得到 404 语义
 * 缺少本文件时，未匹配路径会被 [locale] 动态段吞掉，只剩没有内容的布局壳
 */
export default function LocaleCatchAll() {
  notFound();
}
