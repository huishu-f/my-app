/**
 * @file 用户与认证共享类型
 * @description 定义用户实体、社交账号、统计数据、注册/登录/改密/资料更新 DTO、JWT 载荷及安全用户类型，供前后端共用
 */

/**
 * 用户信息
 * @description 用户完整实体，含资料、社交账号、统计与安全字段；password/tokenVersion/disabled 仅后端使用
 */
export interface User {
  /** 用户唯一ID */
  id: string;
  /** 邮箱地址，可用作登录凭证 */
  email: string;
  /** 名（first name） */
  firstName: string;
  /** 姓（last name） */
  lastName: string;
  /** 用户名，全局唯一，用于展示 */
  username: string;
  /** 头像图片地址 */
  avatar: string;
  /** 个人主页封面图地址 */
  coverImage: string;
  /** 个人简介 */
  bio: string;
  /** 所在地 */
  location: string;
  /** 个人网站地址 */
  website: string;
  /** 注册时间 */
  joined: string;
  /** 用户角色（如 user/admin） */
  role: string;
  /** 公司 */
  company: string;
  /** 是否已认证（加V标识） */
  verified: boolean;
  /** 账号是否被禁用（仅后端使用） */
  disabled?: boolean;
  /** 用户标签列表 */
  tags: string[];
  /** 社交账号信息 */
  social: UserSocial;
  /** 用户统计数据 */
  stats: UserStats;
  /** 密码哈希（仅后端使用，任何 API 响应不得返回） */
  password?: string;
  /** Token 版本号，登出/改密时 +1 使旧 Token 全部失效 */
  tokenVersion?: number;
  /** 外观/主题设置 */
  appearance?: {
    /** 主题模式：light 浅色 / dark 深色 / system 跟随系统 */
    theme: 'light' | 'dark' | 'system';
    /** 字号大小：small / medium / large */
    fontSize: 'small' | 'medium' | 'large';
  };
  /** 当前用户已点赞的文章 ID 列表（仅 /auth/me 返回，用于前端判断点赞状态） */
  likedArticles?: string[];
  /** 当前用户已收藏的文章 ID 列表（仅 /auth/me 返回，用于前端判断收藏状态） */
  favoritedArticles?: string[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 用户社交账号
 * @description 用户在各外部平台的主页/用户名，用于个人主页展示
 */
export interface UserSocial {
  /** Twitter 用户名 */
  twitter: string;
  /** GitHub 用户名 */
  github: string;
  /** LinkedIn 用户名 */
  linkedin: string;
}

/**
 * 用户统计数据
 * @description 用户维度的内容与互动计数
 */
export interface UserStats {
  /** 已发布文章数 */
  articles: number;
  /** 获赞总数 */
  likes: number;
  /** 内容总浏览数 */
  views: number;
}

/**
 * 注册请求参数
 * @description POST /auth/register 的请求体 DTO
 */
export interface RegisterDto {
  /** 注册邮箱 */
  email: string;
  /** 登录密码（明文传输，仅 HTTPS 场景） */
  password: string;
  /** 名（first name） */
  firstName: string;
  /** 姓（last name） */
  lastName: string;
  /** 用户名，需全局唯一 */
  username: string;
}

/**
 * 登录请求参数
 * @description POST /auth/login 的请求体 DTO
 */
export interface LoginDto {
  /** 登录邮箱 */
  email: string;
  /** 登录密码 */
  password: string;
}

/**
 * 修改密码请求参数
 * @description PUT /auth/password 的请求体 DTO，需先校验当前密码
 */
export interface ChangePasswordDto {
  /** 当前密码 */
  currentPassword: string;
  /** 新密码 */
  newPassword: string;
}

/**
 * 更新个人资料请求参数
 * @description PUT /auth/profile 的请求体 DTO，全部可选，仅更新传入字段
 */
export interface UpdateProfileDto {
  /** 名（first name） */
  firstName?: string;
  /** 姓（last name） */
  lastName?: string;
  /** 头像图片地址 */
  avatar?: string;
  /** 个人简介 */
  bio?: string;
  /** 所在地 */
  location?: string;
  /** 个人网站地址 */
  website?: string;
}

/**
 * 认证接口响应数据
 * @description /auth/me、/auth/register、/auth/profile 等接口响应的 data 部分
 */
export interface AuthUserResponse {
  /** 用户信息 */
  user: User;
}

/**
 * JWT 载荷
 * @description JWT token 的 payload 结构，前后端共享；签名与校验在后端完成
 */
export interface AuthPayload {
  /** 用户唯一ID */
  id: string;
  /** 用户邮箱 */
  email: string;
  /** Token 版本号，与用户记录比对判断是否失效 */
  tokenVersion: number;
}

/**
 * 安全用户类型
 * @description 从 User 中剥离 password（密码哈希）、tokenVersion（token 版本）、disabled（禁用标记）三个敏感字段后的类型，可安全返回前端
 */
export type SafeUser = Omit<User, 'password' | 'tokenVersion' | 'disabled'>;
