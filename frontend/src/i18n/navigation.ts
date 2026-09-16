/**
 * @file navigation.ts — next-intl 导航 API
 * @description 包装 Next.js 导航组件，自动注入当前 locale 前缀。
 *              Link/useRouter/usePathname/redirect 接受不带 locale 的裸路径，自动补全。
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
