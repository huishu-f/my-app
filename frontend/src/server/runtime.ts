/**
 * @file runtime.ts
 * @description Next 宿主适配：把 `next/server` 的 `after` 注入后端内核的运行时注册表。
 *
 * 为什么必须有这一层：Next 的 serverless 运行时在响应返回后会冻结/回收函数实例，
 * 裸 fire-and-forget 的写入（如浏览量累加）会被静默丢弃，必须用 `after` 把任务挂到
 * 「响应之后、回收之前」执行。`@my-app/backend` 不能 import `next/server`，所以能力在宿主侧注入。
 *
 * 本模块是纯副作用模块，import 即完成注册；由服务端入口（route-handler）引入一次。
 */
import 'server-only';
import { after } from 'next/server';
import { configureRuntime } from '@my-app/backend/runtime';

configureRuntime({
  // after 接受 () => void | Promise<void>；这里统一包成 Promise 以满足注册表签名
  scheduleAfterResponse: (task) => {
    after(async () => {
      await task();
    });
  },
});
