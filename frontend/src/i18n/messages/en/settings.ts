/**
 * settings 模块（英文）— 键结构由 zh/settings.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/settings';

const settings: Messages = {
  title: 'Account settings',
  subtitle: 'Manage your profile, password and security settings.',
  tabProfile: 'Profile',
  tabPassword: 'Change password',
  firstName: 'First name',
  lastName: 'Last name',
  avatarUrl: 'Avatar URL',
  avatarHint: 'Paste an image link, square 256x256 recommended',
  bio: 'Bio',
  bioHint: 'A short introduction, up to 280 characters',
  location: 'Location',
  website: 'Website',
  saveChanges: 'Save changes',
  profileSaved: 'Profile saved',
  saveFailed: 'Save failed',
  currentPwd: 'Current password',
  newPwd: 'New password',
  newPwdHint: 'At least 6 characters',
  confirmPwd: 'Confirm new password',
  updatePwd: 'Update password',
  pwdChanged: 'Password updated, please sign in again',
  pwdTooShort: 'New password must be at least 6 characters',
  pwdMismatch: 'Passwords do not match',
  pwdSame: 'New password must differ from the current one',
  pwdIncorrect: 'Current password is incorrect',
  pwdChangeFailed: 'Update failed, please check your network and try again',
};

export default settings;
