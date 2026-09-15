/**
 * errors 模块（英文）— 键结构由 zh/errors.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/errors';

const errors: Messages = {
  errorTitle: 'Something went wrong',
  errorDesc: 'An error occurred while loading this page. Try reloading — if the problem persists, please try again later.',
  reload: 'Reload',
  goHome: 'Back to home',
  copyError: 'Copy error details',
  copied: 'Copied',
  notFoundTitle: '404',
  notFoundDesc: 'The page you are looking for does not exist or has been moved.',
  browsePosts: 'Browse posts',
  postsErrorTitle: 'Failed to load posts',
  postsErrorDesc: 'Network error or the service is temporarily unavailable. Please refresh and try again later',
  postErrorTitle: 'Failed to load post',
  postErrorDesc: 'Network error or the post does not exist. Please go back to the list',
  backToList: 'Back to posts',
  dashboardLoginDesc: 'Sign in to access your profile, writing and account settings',
};

export default errors;
