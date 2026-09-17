/**
 * @file toast.ts
 * @description 对 react-hot-toast 的轻封装：补充 info 类型提示后统一默认导出；全局 Toaster 挂载点由布局提供
 */

import toast, { type DefaultToastOptions } from 'react-hot-toast';

/**
 * 弹出一条 info 风格提示（ℹ 图标 + rht-info 样式），可传入额外 toast 选项覆盖默认
 * @param msg 提示文案
 * @param opts react-hot-toast 选项，可选
 * @returns toast 的 dismiss 句柄 id
 */
function info(msg: string, opts?: DefaultToastOptions) {
  return toast(msg, {
    className: 'rht-info',
    icon: 'ℹ',
    ...opts,
  });
}

// react-hot-toast 未内置 info 类型；运行时把 info 挂到默认导出上，用断言绕过其类型定义（反直觉的运行时补丁）
(toast as unknown as { info: typeof info }).info = info;

/** 扩展后的 toast 类型：react-hot-toast 默认导出 + 附加的 info 方法 */
type ToastWithInfo = typeof toast & {
  info: typeof info;
};

/** 对外统一导出的 toast：具备 react-hot-toast 原生方法与自定义 info */
export default toast as ToastWithInfo;
