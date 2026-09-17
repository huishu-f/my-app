```ts
/**
 * @file formatDate.ts
 * @description 日期工具集：格式化、相对时间计算；仅支持毫秒时间戳，时区取运行环境本地
 */

// ==================== 常量 ====================

/** 接口超时时间，单位 ms */
export const API_TIMEOUT = 30 * 1000;

/** 本地存储 key 常量集合 */
export const StorageKey = {
  /** 登录 token */
  TOKEN: 'access_token',
  /** 用户信息缓存 */
  USER_INFO: 'user_info',
} as const;

// ==================== 枚举 / 类型 ====================

/**
 * 账号状态（禁用 number + 注释映射表，让类型说话）
 */
export enum AccountStatus {
  /** 正常 */
  NORMAL = 0,
  /** 冻结 */
  FROZEN = 1,
  /** 已注销 */
  DELETED = 2,
}

/**
 * 订单状态
 */
export enum OrderStatus {
  /** 待支付 */
  PENDING = 0,
  /** 已完成 */
  FINISHED = 1,
  /** 已取消 */
  CANCEL = 2,
}

/**
 * 用户基础信息（来自后端 /user 接口）
 */
export interface UserInfo {
  /** 用户唯一 ID */
  id: string;
  /** 用户昵称 */
  nickname: string;
  /** 账号状态 */
  status: AccountStatus;
  /** 最后登录时间戳（ms），从未登录为 null */
  lastLoginTime: number | null;
}

/**
 * 分页通用请求参数
 */
export type PageQuery = {
  /** 当前页码，从 1 开始 */
  pageNum: number;
  /** 每页条数 */
  pageSize: number;
};

// ==================== 函数 ====================

/**
 * 格式化时间戳为日期字符串
 * @param timestamp 毫秒时间戳（秒级时间戳会静默解析出错误日期，统一传毫秒）
 * @param format 格式模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 * @example
 * formatDate(1712345678000); // '2024-04-06 03:34:38'
 * formatDate(1712345678000, 'YYYY/MM/DD'); // '2024/04/06'
 */
export function formatDate(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return '';
}

/**
 * 获取用户详情
 * @param userId 用户 ID
 * @returns 用户信息；用户不存在时返回 null，不抛异常
 * @throws 网络异常、登录态失效时抛出 RequestError
 */
async function getUserDetail(userId: string): Promise<UserInfo | null> {
  return null;
}

// ==================== Hook ====================

/**
 * 用户列表查询 Hook
 * @param initialPageSize 初始每页数量，默认 10
 * @returns
 * - `list`    当前页用户列表
 * - `loading` 是否加载中
 * - `refresh` 重新拉取当前页
 * @example
 * const { list, loading, refresh } = useUserList(20);
 */
export function useUserList(initialPageSize: number = 10) {
  const list: UserInfo[] = [];
  const loading = false;
  const refresh = () => {};
  return {
    list,
    loading,
    refresh,
  };
}

// ==================== 类 ====================

/**
 * 请求封装类：统一处理请求拦截、错误重试、token 刷新
 * @template T 响应体数据类型
 * @example
 * const client = new RequestClient('/api');
 * const user = await client.get<UserInfo>('/user/1');
 */
export class RequestClient {
  /**
   * 初始化请求实例
   * @param baseUrl 接口基础地址，须以 / 开头
   */
  constructor(baseUrl: string) {}

  /**
   * 发起 GET 请求
   * @param url 请求路径，相对 baseUrl
   * @param params 查询参数，值为 undefined 的键会被过滤
   * @returns 响应体数据
   * @throws 网络异常或响应非 2xx 时抛出 RequestError
   */
  get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return {} as Promise<T>;
  }
}

// ==================== 废弃标记 ====================

/**
 * 时间格式化（旧实现，秒级兼容逻辑有 bug）
 * @deprecated v1.2.0 起废弃，请使用 formatDate；将于 v2.0.0 移除
 */
function oldFormatDate() {}

// ==================== 行内注释（仅限魔法值 / 反直觉逻辑） ====================

const maxUploadSize = 10 * 1024 * 1024; // 最大上传文件：10MB
```
