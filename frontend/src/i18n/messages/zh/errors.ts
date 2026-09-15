/**
 * errors 模块 — 全局/路由级错误边界、404、登录守卫提示
 */
const errors = {
  errorTitle: '出错了',
  errorDesc: '页面加载时发生了错误。请尝试重新加载，如果问题持续出现请稍后再试。',
  reload: '重新加载',
  goHome: '返回首页',
  copyError: '复制错误信息',
  copied: '已复制',
  notFoundTitle: '404',
  notFoundDesc: '你访问的页面不存在或已被移动。',
  browsePosts: '浏览文章',
  postsErrorTitle: '文章加载失败',
  postsErrorDesc: '网络异常或服务暂时不可用，请稍后刷新页面重试',
  postErrorTitle: '文章加载失败',
  postErrorDesc: '网络异常或文章不存在，请返回列表页重试',
  backToList: '返回文章列表',
  dashboardLoginDesc: '登录后即可访问你的个人中心、写文章和账号设置',
};

export type Messages = typeof errors;
export default errors;
