/**
 * @file pages.ts
 * @description 前端页面级组件 Props 类型
 */

import type { ReactNode } from 'react';

/**
 * 全局上下文 Provider 容器组件 Props
 */
export interface ProvidersProps {
  /** Provider 包裹的子节点 */
  children: ReactNode;
}

/**
 * Next.js 错误边界组件 Props
 */
export interface ErrorBoundaryProps {
  /** 捕获到的错误对象（可能含摘要 digest） */
  error: Error & { digest?: string };
  /** 重置错误边界的回调函数 */
  reset: () => void;
}

/**
 * 设置页面 tab 类型：profile 个人资料 / password 修改密码
 */
export type SettingsTab = 'profile' | 'password';
