/**
 * settings 模块（英文）— 键结构由 zh/settings.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/settings';

const settings: Messages = {
  title: 'Account settings',
  subtitle: 'Manage profile, password & security.',
  tabProfile: 'Profile',
  tabPassword: 'Password',
  firstName: 'First name',
  lastName: 'Last name',
  avatarUrl: 'Avatar URL',
  avatarHint: 'Square 256×256 recommended',
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
