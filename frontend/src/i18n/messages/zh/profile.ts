/**
 * profile 模块 — 个人中心页（资料卡/统计/Tab/收藏操作）
 */
const profile = {
  verified: '已认证',
  noBio: '暂无简介',
  statsArticles: '文章',
  statsLikes: '获赞',
  statsViews: '阅读量',
  writeArticle: '写文章',
  editProfile: '编辑资料',
  articlesTab: '文章（{count}）',
  favoritesTab: '收藏（{count}）',
  noArticlesTitle: '还没有文章',
  noArticlesDesc: '开始写你的第一篇文章吧',
  noFavoritesTitle: '还没有收藏',
  noFavoritesDesc: '浏览文章并点击收藏按钮，喜欢的文章会出现在这里',
  removeFavorite: '取消收藏',
  removeFavoriteSuccess: '已取消收藏',
  removeFavoriteFailed: '操作失败，请重试',
};

export type Messages = typeof profile;
export default profile;
