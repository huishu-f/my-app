/**
 * @file home.ts
 * @description 首页 Hero 与近期文章区的英文 UI 文案
 */
import type { Messages } from '../zh/home';

const home: Messages = {
  heroSection: 'Hero',
  heroBadge: 'Technical writing · Engineering notes',
  codeComment: '// authGuard: verify cookie + inject user',
  heroKicker: 'Devoted makers',
  heroTitle: 'Deep notes on engineering',
  heroLead: 'Engineering thoughts worth revisiting.',
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
