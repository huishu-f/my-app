/**
 * @file common.ts
 * @description 全站通用词条（按钮、加载态、分类名等）的中文 UI 文案
 */
const common = {
  close: '关闭',
  backToTop: '回到顶部',
  readMore: '阅读全文',
  loading: '加载中…',
  loadingProfile: '正在加载个人资料',
  verifyingAuth: '正在验证身份',
  loginRequired: '需要登录',
  goLogin: '去登录',
  refresh: '刷新',
  back: '返回',
  required: '必填',
  optional: '可选',
  save: '保存',
  saveFailed: '保存失败',
  cancel: '取消',
  edit: '编辑',
  delete: '删除',
  deleteFailed: '删除失败',
  confirmDelete: '确认删除',
  retry: '重试',
  actionFailed: '操作失败',
  pinned: '置顶',

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
