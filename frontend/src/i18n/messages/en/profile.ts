/**
 * profile 模块（英文）— 键结构由 zh/profile.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/profile';

const profile: Messages = {
  verified: 'Verified',
  noBio: 'No bio yet',
  statsArticles: 'Posts',
  statsLikes: 'Likes',
  statsViews: 'Views',
  writeArticle: 'Write',
  editProfile: 'Edit profile',
  articlesTab: 'Posts ({count})',
  favoritesTab: 'Favorites ({count})',
  noArticlesTitle: 'No posts yet',
  noArticlesDesc: 'Start writing your first post',
  noFavoritesTitle: 'No favorites yet',
  noFavoritesDesc: 'Browse posts and tap the favorite button — posts you love will appear here',
  removeFavorite: 'Remove favorite',
  removeFavoriteSuccess: 'Removed from favorites',
  removeFavoriteFailed: 'Action failed, please try again',
};

export default profile;
