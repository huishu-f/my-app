/**
 * posts 模块（英文）— 键结构由 zh/posts.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/posts';

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
