/**
 * common 模块（英文）— 键结构由 zh/common.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/common';

const common: Messages = {
  close: 'Close',
  backToTop: 'Back to top',
  readMore: 'Read more',
  loading: 'Loading…',
  loadingProfile: 'Loading your profile',
  verifyingAuth: 'Verifying identity',
  loginRequired: 'Sign in needed',
  goLogin: 'Sign in',
  refresh: 'Refresh',
  back: 'Back',
  required: 'Required',
  optional: 'Optional',
  save: 'Save',
  saveFailed: 'Save failed',
  cancel: 'Cancel',
  edit: 'Edit',
  delete: 'Delete',
  deleteFailed: 'Delete failed',
  confirmDelete: 'Confirm delete',
  retry: 'Retry',
  actionFailed: 'Something went wrong',
  pinned: 'Pinned',
  categoryNames: {
    技术: 'Technology',
    设计: 'Design',
    生活: 'Life',
    产品: 'Product',
    创业: 'Startup',
    其他: 'Other',
  },
};

export default common;