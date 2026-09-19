/**
 * @file en.ts
 * @description 英文文案汇总入口：聚合 messages/en 下各模块 UI 文案，并以 zh 的 Messages 类型约束结构对齐
 */
import type { Messages } from '@/i18n/messages/zh';
import nav from '@/i18n/messages/en/nav';
import common from '@/i18n/messages/en/common';
import footer from '@/i18n/messages/en/footer';
import meta from '@/i18n/messages/en/meta';
import home from '@/i18n/messages/en/home';
import posts from '@/i18n/messages/en/posts';
import post from '@/i18n/messages/en/post';
import auth from '@/i18n/messages/en/auth';
import profile from '@/i18n/messages/en/profile';
import settings from '@/i18n/messages/en/settings';
import write from '@/i18n/messages/en/write';
import errors from '@/i18n/messages/en/errors';

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
