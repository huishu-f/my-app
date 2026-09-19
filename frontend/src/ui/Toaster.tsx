/**
 * @file Toaster.tsx
 * @description 全局消息条容器：封装 react-hot-toast，固定右上角展示，外观由 rht-* 类名在全局样式中定义；已由 providers 统一挂载一次，业务侧勿再渲染以免出现重叠容器
 */
'use client';

import { Toaster as RHTToaster } from 'react-hot-toast';

/**
 * Toaster 全局消息条容器（无入参，位置、时长与样式在此统一固定）
 * @example
 * // 已由 providers/AppProviders.tsx 统一挂载一次，业务页面无需再渲染
 * <Toaster />
 */
export function Toaster() {
  return (
    <RHTToaster
      position="top-right"
      containerClassName="rht-toaster"
      // 层级取 --z-toast 令牌（高于 Modal 与移动抽屉的 --z-modal），不再写 99999 这类魔法数字
      containerStyle={{ zIndex: 'var(--z-toast)' }}
      toastOptions={{
        // 普通消息自动关闭时长，单位毫秒
        duration: 3500,
        className: 'rht-toast',
        success: { className: 'rht-success rht-toast' },
        error: { className: 'rht-error rht-toast' },
      }}
    />
  );
}
