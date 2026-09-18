/**
 * @file profile.ts
 * @description 个人主页（资料、统计、文章 / 收藏 Tab）的中文 UI 文案
 */
const profile = {
  verified: '已认证',
  noBio: '暂无简介',
  statsArticles: '文章',
  statsLikes: '获赞',
  statsViews: '阅读',
  writeArticle: '写作',
  editProfile: '编辑资料',
  articlesTab: '文章 · {count}',
  draftsTab: '草稿 · {count}',
  favoritesTab: '收藏 · {count}',
  noArticlesTitle: '还没有文章',
  noArticlesDesc: '开始写第一篇文章',
  noDraftsTitle: '没有草稿',
  noDraftsDesc: '保存的草稿会出现在这里',
  noFavoritesTitle: '还没有收藏',
  noFavoritesDesc: '收藏文章后会出现在这里',
  draftBadge: '草稿',
  continueEditing: '继续编辑',
  removeFavorite: '取消收藏',
  removeFavoriteSuccess: '已取消收藏',
  removeFavoriteFailed: '操作失败',
  roleWriter: '作者',
};

export type Messages = typeof profile;
export default profile;
