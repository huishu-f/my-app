/**
 * posts 模块 — 文章列表页（筛选/搜索/分页/空态）
 */
const posts = {
  title: '全部文章',
  subtitle: '浏览所有已发布内容，按分类或标签筛选你感兴趣的话题。',
  listSection: '全部文章',
  filter: '筛选',
  categories: '分类',
  tags: '标签',
  allCategories: '全部',
  searchPlaceholder: '搜索文章...',
  clearSearch: '清除搜索',
  totalWithPage: '共 {count} 篇 · 第 {current}/{total} 页',
  totalOnly: '共 {count} 篇',
  noResultsTitle: '没有符合条件的文章',
  noResultsDesc: '尝试调整筛选条件或搜索关键词',
  clearFilters: '清除筛选',
  loadErrorTitle: '文章加载失败',
  loadErrorDesc: '网络异常或服务暂时不可用，请稍后刷新页面重试',
  pagination: '分页导航',
  prevPage: '上一页',
  nextPage: '下一页',
  pageN: '第 {n} 页',
};

export type Messages = typeof posts;
export default posts;
