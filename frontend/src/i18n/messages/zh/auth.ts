/**
 * @file auth.ts
 * @description 登录与注册（认证）页的中文 UI 文案
 */
const auth = {
  loginTitle: '欢迎回来',
  loginSubtitle: '登录以发布文章、评论与互动。',
  registerTitle: '创建账号',
  registerSubtitle: '注册即可开始写作与互动。',
  redirectNotice: '登录后继续访问',
  firstName: '名',
  lastName: '姓',
  username: '用户名',
  usernameHint: '字母、数字、下划线 · 3-30 字符',
  email: '邮箱',
  password: '密码',
  pwdPlaceholder: '输入密码',
  pwdPlaceholderMin: '至少 6 位',
  loginSubmit: '登录',
  registerSubmit: '注册',
  forgotPwd: '忘记密码？请联系管理员',
  rateLimit: '5 分钟内最多 5 次',
  noAccount: '还没有账号？',
  registerNow: '立即注册 →',
  hasAccount: '已有账号？',
  loginNow: '立即登录 →',
  loginSuccess: '登录成功',
  registerSuccess: '注册成功，请登录',
  invalidEmail: '请输入有效邮箱',
  emptyPwd: '请输入密码',
  emailOrPwdError: '邮箱或密码错误',
  accountDisabled: '账号已被禁用',
  loginFailed: '登录失败',
  duplicateAccount: '邮箱或用户名已被注册',
  registerFailed: '注册失败，请重试',
  errNameLength: '1-50 个字符',
  errUsername: '字母、数字、下划线 · 3-30 字符',
  errPassword: '密码至少 6 位',
  strengthWeak: '密码强度：弱',
  strengthMedium: '密码强度：中',
  strengthStrong: '密码强度：强',
  showPassword: '显示密码',
  hidePassword: '隐藏密码',
};

export type Messages = typeof auth;
export default auth;
