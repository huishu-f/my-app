/**
 * zh 消息包 — 聚合各模块的简体中文文案
 * @description 新增模块：1) 在 zh/ 下新建模块文件并导出 Messages 类型；
 *              2) 在 en/ 下补齐同构英文模块；3) 在两个聚合器中注册。
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

/** 全量消息类型（en 包以此约束键一一对应） */
export type Messages = typeof zh;

export default zh;
