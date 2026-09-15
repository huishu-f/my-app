/**
 * errors 模块（英文）— 键结构由 zh/errors.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/errors';

const errors: Messages = {
  errorTitle: 'Something went wrong',
  errorDesc: 'This page failed to load. Try reloading — if it persists, come back later.',
  reload: 'Reload',
  goHome: 'Home',
  copyError: 'Copy error details',
  copied: 'Copied',
  notFoundTitle: '404',
  notFoundDesc: 'This page does not exist or has moved.',
  browsePosts: 'Browse posts',
  postsErrorTitle: 'Failed to load posts',
  postsErrorDesc: 'Network error or the service is down. Refresh and try again.',
  postErrorTitle: 'Failed to load post',
  postErrorDesc: 'Network error or post not found. Head back to the list.',
  backToList: 'All posts',
  dashboardLoginDesc: 'Sign in to access your profile, posts and settings',
};

export default errors;
