/**
 * @file settings.ts
 * @description 账号设置页（个人资料与修改密码）的英文 UI 文案
 */
import type { Messages } from '@/i18n/messages/zh/settings';

const settings: Messages = {
  title: 'Account settings',
  subtitle: 'Manage profile, password & security.',
  tabProfile: 'Profile',
  tabPassword: 'Password',
  firstName: 'First name',
  lastName: 'Last name',
  avatarUrl: 'Avatar URL',
  avatarHint: 'Square 256×256 recommended',

  avatarInvalid: 'Only https links from supported hosts: {hosts}',
  bio: 'Bio',
  bioHint: 'Up to 280 characters',
  location: 'Location',
  website: 'Website',
  saveChanges: 'Save',
  profileSaved: 'Profile saved',
  saveFailed: 'Save failed',
  currentPwd: 'Current password',
  newPwd: 'New password',
  newPwdHint: 'At least 6 characters',
  confirmPwd: 'Confirm new password',
  updatePwd: 'Update',
  pwdChanged: 'Password updated — please sign in again',
  pwdTooShort: 'At least 6 characters',
  pwdMismatch: 'Passwords do not match',
  pwdSame: 'New password must differ from the current one',
  pwdIncorrect: 'Current password is incorrect',
  pwdChangeFailed: 'Update failed — check your network and retry',
};

export default settings;
