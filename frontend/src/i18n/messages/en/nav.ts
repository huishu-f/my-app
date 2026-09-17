/**
 * @file nav.ts
 * @description 顶部导航与用户菜单（主题 / 语言切换等）的英文 UI 文案
 */
import type { Messages } from '../zh/nav';

const nav: Messages = {
  brand: 'Engineering Notes',
  home: 'Home',
  posts: 'Posts',
  login: 'Sign in',
  register: 'Sign up',
  userMenu: 'Account',
  profile: 'Profile',
  write: 'Write',
  settings: 'Settings',
  logout: 'Sign out',
  logoutSuccess: 'Signed out',
  logoutFailed: 'Sign out failed — try again',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  language: 'Language',
  themeToggle: 'Toggle theme',
  languageToggle: 'Switch language',
  skipToContent: 'Skip to main content',
  avatarAlt: "{name}'s avatar",
};

export default nav;
