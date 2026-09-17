/**
 * @file en.ts
 * @description 英文文案汇总入口：聚合 messages/en 下各模块 UI 文案，并以 zh 的 Messages 类型约束结构对齐
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
