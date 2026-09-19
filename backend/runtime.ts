/**
 * @file runtime.ts
 * @description 宿主运行时适配器注册表：把「框架能力」与框架解耦，由具体宿主在启动时注入一次。
 *
 * 目前只有一项能力需要注入——「响应返回后执行」。原因是 Next serverless 下响应返回后函数可能被冻结，
 * 裸 fire-and-forget 的写入会被静默丢弃，必须用 `next/server` 的 `after`；而 Express 等长驻进程
 * 没有这个问题，用缺省实现即可。
 */

/** 宿主可注入的运行时能力集合 */
export interface RuntimeAdapter {
  /**
   * 把一个任务排到「当前请求响应已返回之后」执行
   * @param task 待执行任务；实现方须保证不阻塞响应，且吞掉自身异常由任务内部处理
   */
  scheduleAfterResponse?: (task: () => Promise<void>) => void;
}

/** 当前生效的适配器；未注入时为空对象（走各调用点的缺省实现） */
let adapter: RuntimeAdapter = {};

/**
 * 注册宿主运行时能力（启动时调用一次，多次调用按字段合并）
 * @param next 待注入的能力，未提供的字段保持原值
 */
export function configureRuntime(next: RuntimeAdapter): void {
  adapter = { ...adapter, ...next };
}

/**
 * 读取当前运行时能力
 * @returns 已注入的适配器；未注入时为空对象
 */
export function getRuntime(): RuntimeAdapter {
  return adapter;
}
