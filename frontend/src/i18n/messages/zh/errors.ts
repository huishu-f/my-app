const errors = {
  errorTitle: "出错了",
  errorDesc: "页面加载失败，请稍后重试。",
  reload: "重新加载",
  goHome: "返回首页",
  copyError: "复制错误信息",
  copied: "已复制",
  notFoundDesc: "页面不存在或已移动。",
  browsePosts: "浏览文章",
  postsErrorTitle: "文章加载失败",
  postsErrorDesc: "网络异常，请稍后重试。",
  postErrorTitle: "文章加载失败",
  postErrorDesc: "文章加载失败，请返回列表。",
  backToList: "返回文章列表",
  dashboardLoginDesc: "登录后可访问个人中心、写作和设置。",
};

export type Messages = typeof errors;
export default errors;
