const settings = {
  title: "账号设置",
  subtitle: "管理个人资料、密码与安全。",
  tabProfile: "个人资料",
  tabPassword: "修改密码",
  firstName: "名",
  lastName: "姓",
  bioHint: "最多 280 字符",
  avatarUrl: "头像链接",
  avatarHint: "建议方形 256×256",

  avatarInvalid: "请填写以 https 开头的图片链接，或以 / 开头的站内路径",
  bio: "个人简介",
  location: "所在地",
  website: "个人网站",
  saveChanges: "保存修改",
  currentPwd: "当前密码",
  newPwd: "新密码",
  newPwdHint: "至少 6 位",
  confirmPwd: "确认新密码",
  updatePwd: "更新密码",
  pwdTooShort: "新密码至少 6 位",
  pwdMismatch: "两次密码不一致",
  pwdSame: "新密码不能与当前密码相同",
  pwdIncorrect: "当前密码不正确",
  pwdRequired: "请输入当前密码",
  websiteInvalid: "网站链接需以 http:// 或 https:// 开头",
};

export type Messages = typeof settings;
export default settings;
