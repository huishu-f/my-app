/**
 * @file zh.ts
 * @description 中文文案汇总入口：聚合 messages/zh 下各模块 UI 文案，并导出 Messages 类型作为全站文案的基准结构
 */
import nav from '@/i18n/messages/zh/nav';
import common from '@/i18n/messages/zh/common';
import footer from '@/i18n/messages/zh/footer';
import meta from '@/i18n/messages/zh/meta';
import home from '@/i18n/messages/zh/home';
import posts from '@/i18n/messages/zh/posts';
import post from '@/i18n/messages/zh/post';
import auth from '@/i18n/messages/zh/auth';
import profile from '@/i18n/messages/zh/profile';
import settings from '@/i18n/messages/zh/settings';
import write from '@/i18n/messages/zh/write';
import errors from '@/i18n/messages/zh/errors';

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
