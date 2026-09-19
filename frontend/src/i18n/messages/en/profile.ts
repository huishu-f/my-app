/**
 * @file profile.ts
 * @description 个人主页（资料、统计、文章 / 收藏 Tab）的英文 UI 文案
 */
import type { Messages } from '@/i18n/messages/zh/profile';

const profile: Messages = {
  title: 'Profile',
  verified: 'Verified',
  noBio: 'No bio yet',
  statsArticles: 'Posts',
  statsLikes: 'Likes',
  statsViews: 'Views',
  writeArticle: 'Write',
  editProfile: 'Edit',
  loadFailedTitle: 'Failed to load',
  loadFailedDesc: 'Could not load the data. Please try again.',
  articlesTab: 'Posts · {count}',
  draftsTab: 'Drafts · {count}',
  favoritesTab: 'Favorites · {count}',
  noArticlesTitle: 'No posts yet',
  noArticlesDesc: 'Start writing your first post',
  noDraftsTitle: 'No drafts',
  noDraftsDesc: 'Saved drafts appear here',
  noFavoritesTitle: 'No favorites yet',
  noFavoritesDesc: 'Favorited posts appear here',
  draftBadge: 'Draft',
  continueEditing: 'Keep editing',
  removeFavorite: 'Unfavorite',
  removeFavoriteSuccess: 'Unfavorited',
  removeFavoriteFailed: 'Failed',
  roleWriter: 'Writer',
};

export default profile;
