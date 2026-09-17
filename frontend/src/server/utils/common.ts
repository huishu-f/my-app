/**
 * @file common.ts
 * @description 服务端通用小工具：生成全局唯一 ID
 */
import { randomUUID } from 'node:crypto';

/**
 * 生成全局唯一 ID
 * @returns RFC 4122 v4 UUID 字符串，用于实体主键等
 */
export function generateId(): string {
  return randomUUID();
}
