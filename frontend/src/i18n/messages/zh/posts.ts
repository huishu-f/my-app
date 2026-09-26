const posts = {
  title: "全部文章",
  subtitle: "浏览全部文章，按分类或标签筛选。",
  filter: "筛选",
  categories: "分类",
  tags: "标签",
  allCategories: "全部",
  searchPlaceholder: "搜索文章…",
  clearSearch: "清除搜索",
  totalWithPage: "共 {count} 篇 · 第 {current}/{total} 页",
  totalOnly: "共 {count} 篇",
  noResultsTitle: "没有符合条件的文章",
  noResultsDesc: "试试其他筛选条件或关键词",
  clearFilters: "清除筛选",
  loadErrorTitle: "文章加载失败",
  loadErrorDesc: "网络异常，请稍后重试。",
  pagination: "分页导航",
  prevPage: "上一页",
  nextPage: "下一页",
  pageN: "第 {n} 页",
};

export type Messages = typeof posts;
export default posts;
