/**
 * @file 前端页面级组件 Props
 * @description 全局布局层组件的 Props 类型：AppProviders 上下文容器与 Next.js 错误边界
 */

import type { ReactNode } from 'react';

/**
 * 全局上下文 Provider 容器组件 Props
 * @description 根布局中包裹全局 Provider 链的容器组件
 */
export interface AppProvidersProps {
  /** Provider 包裹的子节点 */
  children: ReactNode;
}

/**
 * Next.js 错误边界组件 Props
 * @description app 路由的 error.tsx 组件接收的参数
 */
export interface ErrorBoundaryProps {
  /** 捕获到的错误对象（服务端错误可能仅含摘要 digest） */
  error: Error & { digest?: string };
  /** 重置错误边界的回调函数（用于重试渲染） */
  reset: () => void;
}
