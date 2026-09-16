/**
 * @file 认证模块后端接口契约
 * @description 定义认证域的后端分层契约：Token 服务、认证业务服务、密码服务及用户仓储，覆盖注册、登录、登出、改密、资料更新等操作
 */

import type {
  User,
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  UpdateProfileDto,
  AuthPayload,
} from '../user';

/**
 * Token 校验结果
 * @description 判别联合：校验成功携带 payload，失败时 errorType 区分过期与无效
 */
export type TokenVerifyResult =
  | { success: true; payload: AuthPayload }
  | { success: false; errorType: 'expired' | 'invalid' };

/**
 * Token 服务接口
 * @description JWT 的生成与校验层契约 */
export interface TokenService {
  /**
   * 生成 Token
   * @param payload JWT 载荷
   * @returns 签名后的 token 字符串
   */
  generate(payload: AuthPayload): string;
  /**
   * 校验 Token
   * @param token 待校验的 token 字符串
   * @returns 校验结果：成功携带 payload；失败时 errorType 为 'expired'（过期）或 'invalid'（无效）
   */
  verify(token: string): TokenVerifyResult;
  /**
   * 解码 Token（不验签）
   * @description 用于 refresh 场景：token 过期但内容可信时取出 payload
   * @param token 过期的 token 字符串
   * @returns 解码出的载荷，解码失败返回 null
   */
  decode(token: string): AuthPayload | null;
}

/**
 * 认证业务服务接口
 * @description 认证域的核心业务层契约，供各后端适配实现 */
export interface AuthService {
  /**
   * 注册新用户
   * @param dto 注册信息（邮箱、密码、姓名、用户名）
   * @returns 创建成功的用户实体
   * @throws 邮箱或用户名已存在时抛出冲突错误
   */
  register(dto: RegisterDto): Promise<User>;
  /**
   * 登录
   * @param dto 邮箱与密码
   * @returns 登录用户实体
   * @throws 凭证不匹配或账号禁用时抛出错误
   */
  login(dto: LoginDto): Promise<User>;
  /**
   * 获取当前用户信息
   * @param userId 当前用户ID
   * @returns 用户实体
   * @throws 用户不存在时抛出错误
   */
  getMe(userId: string): Promise<User>;
  /**
   * 登出
   * @description 通过递增 tokenVersion 使该用户全部旧 token 失效
   * @param userId 当前用户ID
   */
  logout(userId: string): Promise<void>;
  /**
   * 修改密码
   * @param userId 当前用户ID
   * @param dto 当前密码与新密码
   * @throws 当前密码错误时抛出错误
   */
  changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
  /**
   * 更新个人资料
   * @param userId 当前用户ID
   * @param dto 待更新的资料字段
   * @returns 更新后的用户实体
   */
  updateProfile(userId: string, dto: UpdateProfileDto): Promise<User>;
  /**
   * 刷新 Token 前的用户校验
   * @description 校验过期 payload 中用户的有效性（存在、未禁用、tokenVersion 匹配），通过后返回用户供 cookie helper 签发新 token
   * @param decoded 过期 token 解码出的载荷
   * @returns 有效用户实体
   * @throws 用户不存在、被禁用或版本不匹配时抛出错误
   */
  refresh(decoded: AuthPayload): Promise<User>;
}

/**
 * 密码服务接口
 * @description 密码哈希与比对的抽象层契约 */
export interface PasswordService {
  /**
   * 密码哈希
   * @param password 明文密码
   * @returns 哈希后的密码字符串
   */
  hash(password: string): Promise<string>;
  /**
   * 明文密码比对
   * @param password 待校验的明文密码
   * @param hash 存储的密码哈希
   * @returns 是否匹配
   */
  compare(password: string, hash: string): Promise<boolean>;
}

/**
 * 用户数据仓储接口
 * @description 用户持久化层契约，供文件/数据库等不同存储适配实现 */
export interface UserRepository {
  /**
   * 查询全部用户
   * @returns 用户列表
   */
  findAll(): Promise<User[]>;
  /**
   * 按 ID 查询用户
   * @param id 用户ID
   * @returns 用户实体，不存在返回 undefined
   */
  findById(id: string): Promise<User | undefined>;
  /**
   * 按邮箱查询用户
   * @param email 邮箱地址
   * @returns 用户实体，不存在返回 undefined
   */
  findByEmail(email: string): Promise<User | undefined>;
  /**
   * 判断邮箱或用户名是否已存在
   * @param email 待检查的邮箱
   * @param username 待检查的用户名
   * @returns 任一已存在返回 true
   */
  existsByEmailOrUsername(email: string, username: string): Promise<boolean>;
  /**
   * 创建用户
   * @param user 完整用户实体
   * @returns 落库后的用户实体
   */
  create(user: User): Promise<User>;
  /**
   * 部分更新用户
   * @param id 用户ID
   * @param partial 待合并的字段子集
   * @returns 更新后的用户实体，用户不存在返回 undefined
   */
  update(id: string, partial: Partial<User>): Promise<User | undefined>;
  /**
   * 删除用户
   * @param id 用户ID
   * @returns 是否删除成功
   */
  delete(id: string): Promise<boolean>;
  /**
   * 种子数据初始化
   * @param data 初始用户数据
   */
  seed(data: User[]): Promise<void>;
}
