/**
 * @file posts.ts
 * @description 文章列表页（分类标签筛选、搜索、分页）的英文 UI 文案
 */
import type { Messages } from '@/i18n/messages/zh/posts';

const posts: Messages = {
  title: 'All posts',
  subtitle: 'Browse all posts — filter by category or tag.',
  listSection: 'All posts',
  filter: 'Filters',
  categories: 'Categories',
  tags: 'Tags',
  allCategories: 'All',
  searchPlaceholder: 'Search posts…',
  clearSearch: 'Clear search',
  totalWithPage: '{count, plural, one {# post} other {# posts}} · Page {current}/{total}',
  totalOnly: '{count, plural, one {# post} other {# posts}}',
  noResultsTitle: 'No matching posts',
  noResultsDesc: 'Try different filters or keywords.',
  clearFilters: 'Clear filters',
  loadErrorTitle: 'Failed to load posts',
  loadErrorDesc: 'Network error. Refresh and try again.',
  pagination: 'Pagination',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  pageN: 'Page {n}',
};

export default posts;
