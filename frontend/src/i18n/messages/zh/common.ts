/**
 * common 模块 — 跨页面复用的通用文案（关闭/加载/操作动词/通用提示）
 */
const common = {
  close: '关闭',
  backToTop: '返回顶部',
  readMore: '阅读全文',
  loading: '加载中...',
  loadingProfile: '正在获取个人资料',
  verifyingAuth: '正在验证登录状态',
  loginRequired: '请先登录',
  goLogin: '去登录',
  refresh: '刷新页面',
  back: '返回',
  required: '必填',
  optional: '可选',
  save: '保存',
  saveFailed: '保存失败',
  cancel: '取消',
  edit: '编辑',
  delete: '删除',
  deleteFailed: '删除失败，请重试',
  confirmDelete: '确认删除',
  retry: '重试',
  actionFailed: '操作失败',
  pinned: '置顶',
  /** 分类展示名映射（数据值保持中文原值，仅展示层翻译；共享映射见 src/lib/category.ts） */
  categoryNames: {
    技术: '技术',
    设计: '设计',
    生活: '生活',
    产品: '产品',
    创业: '创业',
    其他: '其他',
  },
};

export type Messages = typeof common;
export default common;
