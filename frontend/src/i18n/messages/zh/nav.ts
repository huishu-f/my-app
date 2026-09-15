/**
 * nav 模块 — 品牌名、导航链接、用户菜单、移动端菜单、主题/语言切换、无障碍标签
 */
const nav = {
  brand: '我的博客',
  home: '首页',
  posts: '文章',
  login: '登录',
  userMenu: '用户菜单',
  profile: '个人中心',
  write: '写文章',
  settings: '账号设置',
  logout: '退出登录',
  logoutSuccess: '已登出',
  logoutFailed: '登出失败，请重试',
  openMenu: '打开菜单',
  closeMenu: '关闭菜单',
  themeToggle: '切换主题',
  languageToggle: '切换语言',
  skipToContent: '跳到主内容',
  avatarAlt: '{name}的头像',
};

export type Messages = typeof nav;
export default nav;
