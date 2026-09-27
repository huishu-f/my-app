const feedback = {
  common: {
    actionFailed: "操作失败，请稍后重试",
    unknownError: "系统异常，请稍后重试",
    networkError: "网络异常，请检查网络后重试",
    timeout: "请求超时，请稍后重试",
    rateLimited: "操作过于频繁，请稍后再试",
    sessionExpired: "登录已过期，请重新登录",
    notLoggedIn: "请先登录后再操作",
    forbidden: "没有权限执行此操作",
    contentGone: "内容不存在或已被删除",
    requestFailed: "请求失败（{status}）",
  },

  create: {
    success: "已新增{entity}",
    failed: "{entity}新增失败，请稍后重试",
  },

  update: {
    success: "已更新{entity}",
    failed: "{entity}更新失败，请稍后重试",
  },

  delete: {
    success: "已删除{entity}",
    failed: "{entity}删除失败，请稍后重试",
  },

  toggle: {
    likeOn: "已点赞",
    likeOff: "已取消点赞",
    favoriteOn: "已收藏",
    favoriteOff: "已取消收藏",
  },

  session: {
    loggedIn: "登录成功",
    loginFailed: "登录失败，请稍后重试",
    registered: "注册成功，请登录",
    registerFailed: "注册失败，请重试",
    loggedOut: "已登出",
    logoutFailed: "登出失败，请重试",
    passwordChanged: "密码修改成功，请重新登录",
  },

  post: {
    draftSaved: "草稿已保存",
    draftUpdated: "草稿已更新",
    draftRestored: "已恢复上次未保存的草稿",
    published: "文章已发布",
  },

  form: {
    requiredInput: "请输入{field}",
    tooShort: "{field}至少 {min} 个字符",
    tooLong: "{field}最多 {max} 个字符",
    format: "{field}格式不正确",
    sameAsCurrent: "新密码不能与当前密码相同",
    invalidField: "该字段填写有误",
    imageUrl: "请填写以 https 开头的图片链接，或以 / 开头的站内路径",
  },

  entity: {
    post: "文章",
    comment: "评论",
    profile: "个人资料",
  },

  field: {
    title: "标题",
    content: "正文",
    summary: "摘要",
    category: "分类",
    tags: "标签",
    coverImage: "封面图",
    email: "邮箱",
    password: "密码",
    currentPassword: "当前密码",
    newPassword: "新密码",
    firstName: "名",
    lastName: "姓",
    username: "用户名",
    avatar: "头像",
    bio: "简介",
    location: "所在地",
    website: "个人网站",
  },
};

export default feedback;
