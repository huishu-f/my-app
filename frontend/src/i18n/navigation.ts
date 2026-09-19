/**
 * @file navigation.ts
 * @description 语言感知的导航 API 统一出口：站内跳转与链接一律从这里导入，替代 next/link、next/navigation 以自动处理 locale 前缀
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from '@/i18n/routing';

/**
 * 语言感知导航能力（由 createNavigation(routing) 生成）
 * - `Link`        渲染时自动为 href 加当前 locale 前缀的链接组件
 * - `redirect`    服务端/客户端重定向，自动补 locale 前缀
 * - `usePathname` 返回不含 locale 前缀的当前业务路径
 * - `useRouter`   push/replace 时自动保留当前 locale 的路由对象
 * - `getPathname` 非组件环境（如 generateMetadata）下按目标 locale 解析完整路径
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
