/**
 * @file next-intl 导航 API
 * @description 通过 createNavigation 包装 Next.js 导航原语，自动注入当前 locale 前缀：
 *              Link / redirect / usePathname / useRouter / getPathname 接受不带 locale
 *              的裸路径即可自动补全，无需各处手动拼接 /zh /en。
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** 带 locale 前缀注入能力的导航 API 集合，与 next/navigation 同名 API 用法一致 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
