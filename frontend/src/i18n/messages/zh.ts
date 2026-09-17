/**
 * @file zh.ts
 * @description 中文文案汇总入口：聚合 messages/zh 下各模块 UI 文案，并导出 Messages 类型作为全站文案的基准结构
 */
import nav from './zh/nav';
import common from './zh/common';
import footer from './zh/footer';
import meta from './zh/meta';
import home from './zh/home';
import posts from './zh/posts';
import post from './zh/post';
import auth from './zh/auth';
import profile from './zh/profile';
import settings from './zh/settings';
import write from './zh/write';
import errors from './zh/errors';

const zh = {
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

export type Messages = typeof zh;

export default zh;
