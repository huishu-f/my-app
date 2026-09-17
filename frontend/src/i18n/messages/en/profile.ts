/**
 * @file profile.ts
 * @description 个人主页（资料、统计、文章 / 收藏 Tab）的英文 UI 文案
 */
import type { Messages } from '../zh/profile';

const profile: Messages = {
  verified: 'Verified',
  noBio: 'No bio yet',
  statsArticles: 'Posts',
  statsLikes: 'Likes',
  statsViews: 'Views',
  writeArticle: 'Write',
  editProfile: 'Edit',
  articlesTab: 'Posts · {count}',
  favoritesTab: 'Favorites · {count}',
  noArticlesTitle: 'No posts yet',
  noArticlesDesc: 'Start writing your first post',
  noFavoritesTitle: 'No favorites yet',
  noFavoritesDesc: 'Favorited posts appear here',
  removeFavorite: 'Unfavorite',
  removeFavoriteSuccess: 'Unfavorited',
  removeFavoriteFailed: 'Failed',
  roleWriter: 'Writer',
};

export default profile;
