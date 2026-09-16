/**
 * @file UI 组件 Props 共享类型
 * @description 前端各类组件 Props 的类型定义，涵盖基础展示组件、页面级组件、按钮/输入框、请求层参数及 Hooks Mutation 参数，供组件与调用方共享
 */

import type {
  ReactNode,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  InputHTMLAttributes,
} from 'react';
import type { Post } from './blog';
import type { User } from './user';

/**
 * 子节点 Props
 * @description 通用容器组件基础类型：接收子节点与可选类名
 */
export interface ChildrenProps {
  /** 子节点内容 */
  children: ReactNode;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * Alert 提示样式变体
 * @description 'success' 成功 / 'warning' 警告 / 'error' 错误 / 'info' 信息
 */
export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

/**
 * Alert 提示组件 Props
 * @description 条状提示组件，可带图标并根据 visible 控制显隐
 */
export interface AlertProps {
  /** 样式变体 */
  variant: AlertVariant;
  /** 自定义图标，缺省使用变体默认图标 */
  icon?: ReactNode;
  /** 子节点内容（提示文案） */
  children: ReactNode;
  /** 是否可见，缺省为可见 */
  visible?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 文章卡片组件 Props
 * @description 列表页/网格页的文章卡片，支持水平/垂直两种布局及丰富的自定义插槽
 */
export interface ArticleCardProps {
  /** 文章数据 */
  post: Post;
  /** 卡片整体跳转链接，传入时卡片可点击（默认不跳转） */
  href?: string;
  /** 交错动画索引，用于列表入场 stagger 动画 */
  index?: number;
  /** 分类上方额外标签（如置顶、草稿标记） */
  badge?: ReactNode;
  /** 标题下方标签列表 */
  tags?: string[];
  /** 底部操作按钮区（如编辑/删除） */
  actions?: ReactNode;
  /** 额外统计项（如评论数），每项含图标与数值 */
  extraStats?: { icon: ReactNode; value: number }[];
  /** 封面容器宽度（如 'w-40'） */
  coverWidth?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 卡片布局变体：horizontal 水平（默认）或 vertical 垂直（网格布局用） */
  variant?: 'horizontal' | 'vertical';
}

/**
 * 头像尺寸
 * @description 'xs' 特小 / 'sm' 小 / 'md' 中（默认）/ 'lg' 大 / 'xl' 特大
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 头像组件 Props
 * @description 用户头像；有图片地址时显示图片，否则以首字母占位 */
export interface AvatarProps {
  /** 头像首字母（无图片时显示） */
  initials: string;
  /** 头像尺寸，默认 'md' */
  size?: AvatarSize;
  /** 头像图片地址 */
  src?: string;
  /** 图片 alt 文本，有 src 时生效，缺省为装饰性空 alt */
  alt?: string;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 容器组件 Props
 * @description 页面主容器，结构等同于 {@link ChildrenProps}
 */
export type ContainerProps = ChildrenProps;

/**
 * 封面占位组件 Props
 * @description 文章无封面图时的装饰性占位块
 */
export interface CoverFallbackProps {
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 空状态组件 Props
 * @description 列表/页面无数据时展示的图标 + 标题 + 描述 + 可选操作
 */
export interface EmptyStateProps {
  /** 空状态图标 */
  icon: ReactNode;
  /** 标题 */
  title: string;
  /** 描述文本 */
  description?: string;
  /** 操作按钮（如"去创建"） */
  action?: ReactNode;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 表单字段组件 Props
 * @description 表单字段包装器：统一标签、提示、错误与必填标记的布局
 */
export interface FormFieldProps {
  /** 标签文本 */
  label: string;
  /** 提示文本（展示在控件下方） */
  hint?: string;
  /** 错误信息（非空时高亮错误态） */
  error?: string;
  /** 是否必填（标签附必填标记） */
  required?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 子节点内容（表单控件） */
  children: ReactNode;
}

/**
 * 弹窗组件 Props
 * @description 通用 Modal 弹窗：遮罩 + 标题栏 + 内容区，点击遮罩或关闭按钮触发 onClose
 */
export interface ModalProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 弹窗标题 */
  title?: string;
  /** 子节点内容（弹窗主体） */
  children: ReactNode;
  /** 弹窗最大宽度（如 'max-w-lg'） */
  maxWidth?: string;
}

/**
 * 页面头部组件 Props
 * @description 页面标题区：标题 + 副标题 + 右侧操作区 */
export interface PageHeaderProps {
  /** 页面标题 */
  title: ReactNode;
  /** 副标题 */
  subtitle?: ReactNode;
  /** 右侧操作区域（按钮等） */
  actions?: ReactNode;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 密码强度组件 Props
 * @description 根据传入密码实时展示强度评估
 */
export interface PasswordStrengthProps {
  /** 待评估的密码字符串 */
  password: string;
}

/**
 * 加载指示器组件 Props
 * @description 通用 Spinner 转圈指示器 */
export interface SpinnerProps {
  /** 尺寸：'sm' 小 / 'md' 中（默认） */
  size?: 'sm' | 'md';
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 统计项
 * @description StatsGrid 的单格数据：标签 + 值
 */
export interface StatItem {
  /** 统计项标签 */
  label: ReactNode;
  /** 统计项值 */
  value: ReactNode;
}

/**
 * 统计网格组件 Props
 * @description 以网格布局展示一组统计项 */
export interface StatsGridProps {
  /** 统计项列表 */
  items: StatItem[];
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 标签样式变体
 * @description 'ink' 墨色 / 'ember' 琥珀 / 'crimson' 绯红 / 'slate' 石板灰
 */
export type TagVariant = 'ink' | 'ember' | 'crimson' | 'slate';

/**
 * 标签组件 Props
 * @description 内容标签/分类标签的小徽章组件 */
export interface TagProps {
  /** 子节点内容（标签文本） */
  children: ReactNode;
  /** 样式变体，默认 'ink' */
  variant?: TagVariant;
  /** 尺寸：'sm' 小 / 'md' 中（默认） */
  size?: 'sm' | 'md';
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 文章 ID Props
 * @description 按 postId 操作的按钮组件共用 props（点赞、收藏等） */
export interface PostIdProps {
  /** 目标文章ID */
  postId: string;
}

/**
 * 文章搜索输入框组件 Props
 * @description 博客列表页顶部的关键词搜索框 */
export interface PostsSearchInputProps {
  /** 初始搜索值（用于从 URL 参数回填） */
  initialValue: string;
}

/**
 * 文章列表侧边栏组件 Props
 * @description 博客列表页侧边栏：分类与标签筛选 + 自定义内容区 */
export interface PostSidebarProps {
  /** 全部分类列表 */
  categories: string[];
  /** 标签列表，每项含标签名与文章数量 */
  tags: { name: string; count: number }[];
  /** 当前选中分类（'all' 表示全部） */
  currentCategory: string;
  /** 当前选中标签，null 表示未选 */
  currentTag: string | null;
  /** 子节点内容（自定义插槽） */
  children: ReactNode;
  /** 当前列表是否零结果（用于无结果时自动清除搜索词） */
  zeroResults?: boolean;
}

/**
 * 文章操作区组件 Props
 * @description 文章详情页的操作条（点赞/收藏/编辑/删除等），需登录用户上下文 */
export interface PostActionsProps {
  /** 当前登录用户，null 表示未登录 */
  user: User | null;
}

/**
 * 评论区组件 Props
 * @description 文章详情页评论区：发表、编辑、删除评论 */
export interface CommentsSectionProps {
  /** 所属文章ID */
  postId: string;
  /** 当前登录用户，null 表示仅可查看 */
  user: User | null;
  /** 文章作者ID，用于判断其是否有权删除他人评论 */
  postAuthorId?: string;
}

/**
 * 文章目录组件 Props
 * @description 文章详情页右侧的 TOC 目录导航 */
export interface PostTocProps {
  /** 目标文章ID */
  articleId: string;
}

/**
 * 按钮样式变体
 * @description 'primary' 主按钮 / 'ghost' 幽灵 / 'outline' 描边 / 'danger' 危险操作
 */
export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger';
/**
 * 按钮尺寸
 * @description 'sm' 小 / 'md' 中（默认）/ 'lg' 大
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * 按钮基础 Props
 * @description Button 组件的通用部分：外观与加载态 */
export interface ButtonBaseProps {
  /** 样式变体，默认 'primary' */
  variant?: ButtonVariant;
  /** 尺寸，默认 'md' */
  size?: ButtonSize;
  /** 是否加载中（加载中禁用点击并显示 spinner） */
  loading?: boolean;
}

/**
 * 按钮作为 button 元素时的 Props
 * @description 未传 href 时的形态：继承原生 button 属性，href 显式排除
 */
export type ButtonAsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

/**
 * 按钮作为链接元素时的 Props
 * @description 传 href 时的形态：继承原生 a 属性，href 必填
 */
export type ButtonAsLink = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * 按钮组件 Props
 * @description ButtonAsButton 与 ButtonAsLink 的联合类型，组件据此做多态渲染 */
export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * 输入框组件 Props
 * @description 扩展原生 input 属性，附加左右插槽与状态标记 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧元素（如显示/隐藏密码按钮） */
  rightElement?: ReactNode;
  /** 是否错误状态（红框提示） */
  error?: boolean;
  /** 是否成功状态（绿框提示） */
  success?: boolean;
}

/**
 * API 校验错误详情项
 * @description 服务端字段校验失败时返回的单条错误信息 */
export interface ValidationErrorDetail {
  /** 出错字段的路径 */
  path: string;
  /** 该字段的错误信息 */
  message: string;
}

/**
 * 请求选项
 * @description 扩展 fetch RequestInit，附加自动序列化 body、query 拼接与鉴权控制 */
export interface RequestOptions extends Omit<RequestInit, 'body' | 'cache'> {
  /** 请求体，任意可 JSON 序列化的值（发送时自动 JSON.stringify 并设 Content-Type） */
  body?: unknown;
  /** URL query 参数，自动拼接到 URL，跳过 null/undefined/空串 */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** 跳过 401 自动重定向到登录页（用于 /auth/me 等探测型接口） */
  skipAuthRedirect?: boolean;
  /**
   * 服务端请求时跳过 httpOnly Cookie 转发
   * 公开数据专用：不触发 cookies() 动态 API，使页面可静态渲染/ISR，
   * 同时避免携带 Cookie 的响应写入共享缓存
   */
  skipAuth?: boolean;
  /** fetch 缓存策略（RequestCache 来自 DOM 标准，Next.js 扩展值需自行 cast） */
  cache?: RequestCache;
}
