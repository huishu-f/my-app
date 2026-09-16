/**
 * home 模块（英文）— 键结构由 zh/home.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/home';

const home: Messages = {
  brandSection: 'About',
  heroBadge: 'Technical writing · Engineering notes',
  codeComment: '// authGuard: verify cookie + inject user',
  heroTitleLine1: 'Devoted makers',
  heroTitlePrefix: 'keep ',
  heroTitleEm: 'deep notes',
  heroLead: 'Capturing engineering thoughts worth revisiting.',
  browsePosts: 'Browse posts',
  startWriting: 'Start writing',
  latestSection: 'Latest posts',
  latestTitle: 'Latest posts',
  latestSubtitle: 'Latest engineering thoughts & practice',
  viewAll: 'View all',
  viewAllCount: 'View all {count} posts',
  loadErrorTitle: 'Failed to load posts',
  loadErrorDesc: 'Network error or the service is down. Refresh and try again.',
};

export default home;
