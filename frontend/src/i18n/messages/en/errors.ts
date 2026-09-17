/**
 * @file errors.ts
 * @description 全局错误页与加载失败提示（错误页 / 404 / 文章加载失败）的英文 UI 文案
 */
import type { Messages } from '../zh/errors';

const errors: Messages = {
  errorTitle: 'Something went wrong',
  errorDesc: 'Failed to load. Try again shortly.',
  reload: 'Reload',
  goHome: 'Home',
  copyError: 'Copy error details',
  copied: 'Copied',
  notFoundTitle: '404',
  notFoundDesc: 'Page not found or moved.',
  browsePosts: 'Browse posts',
  postsErrorTitle: 'Failed to load posts',
  postsErrorDesc: 'Network error. Refresh and try again.',
  postErrorTitle: 'Failed to load post',
  postErrorDesc: 'Post not found. Go back to the list.',
  backToList: 'All posts',
  dashboardLoginDesc: 'Sign in to access your profile, posts and settings.',
};

export default errors;
