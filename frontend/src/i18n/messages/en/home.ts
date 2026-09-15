/**
 * home 模块（英文）— 键结构由 zh/home.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/home';

const home: Messages = {
  brandSection: 'Brand intro',
  heroBadge: 'Multi-author technical writing',
  codeComment: '// authGuard: verify cookie + inject user',
  heroTitleLine1: 'People who take craft seriously',
  heroTitlePrefix: 'keep ',
  heroTitleEm: 'deep engineering notes',
  heroLead: 'Focused on architecture and engineering practice — thoughts worth reading twice.',
  browsePosts: 'Browse posts',
  startWriting: 'Start writing',
  latestSection: 'Latest posts',
  latestTitle: 'Latest posts',
  latestSubtitle: 'Freshly published technical articles and engineering practices',
  viewAll: 'View all',
  viewAllCount: 'View all {count}',
  loadErrorTitle: 'Failed to load posts',
  loadErrorDesc: 'Network error or the service is temporarily unavailable. Please refresh and try again later.',
};

export default home;
