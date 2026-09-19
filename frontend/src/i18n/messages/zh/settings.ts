/**
 * @file settings.ts
 * @description 账号设置页（个人资料与修改密码）的中文 UI 文案
 */
const settings = {
  title: '账号设置',
  subtitle: '管理个人资料、密码与安全。',
  tabProfile: '个人资料',
  tabPassword: '修改密码',
  firstName: '名',
  lastName: '姓',
  avatarUrl: '头像链接',
  avatarHint: '建议方形 256×256',

  avatarInvalid: '仅支持白名单图床的 https 链接：{hosts}',
  bio: '个人简介',
  bioHint: '最多 280 字符',
  location: '所在地',
  website: '个人网站',
  saveChanges: '保存修改',
  profileSaved: '资料已保存',
  saveFailed: '保存失败',
  currentPwd: '当前密码',
  newPwd: '新密码',
  newPwdHint: '至少 6 位',
  confirmPwd: '确认新密码',
  updatePwd: '更新密码',
  pwdChanged: '密码修改成功，请重新登录',
  pwdTooShort: '新密码至少 6 位',
  pwdMismatch: '两次密码不一致',
  pwdSame: '新密码不能与当前密码相同',
  pwdIncorrect: '当前密码不正确',
  pwdChangeFailed: '修改失败，请检查网络后重试',
};

export type Messages = typeof settings;
export default settings;
