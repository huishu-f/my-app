/**
 * en 消息包 — 聚合各模块的英文文案，类型受 zh 包约束（缺键/多键均编译报错）
 */
import type { Messages } from './zh';
import nav from './en/nav';
import common from './en/common';
import footer from './en/footer';
import meta from './en/meta';
import home from './en/home';
import posts from './en/posts';
import post from './en/post';
import auth from './en/auth';
import profile from './en/profile';
import settings from './en/settings';
import write from './en/write';
import errors from './en/errors';

const en: Messages = {
  nav,
  common,
  footer,
  meta,
  home,
  posts,
  post,
  auth,
  profile,
  settings,
  write,
  errors,
};

export default en;
