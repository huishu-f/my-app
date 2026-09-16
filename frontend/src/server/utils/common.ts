/**
 * @file 通用工具函数集合
 * @description 服务端通用基础工具，当前提供全局唯一 ID 生成能力，供各业务模块创建实体时复用
 */

import { randomUUID } from 'node:crypto';

/**
 * 生成全局唯一 ID（UUID v4）
 * @returns 随机 UUID v4 字符串
 * @example
 * generateId() // => '3b241101-e2bb-4255-8caf-4136c566a962'
 */
export function generateId(): string {
  return randomUUID();
}
