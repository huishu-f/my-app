/**
 * posts 模块（英文）— 键结构由 zh/posts.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/posts';

const posts: Messages = {
  title: 'All posts',
  subtitle: 'Browse everything published, filtered by the categories and tags you care about.',
  listSection: 'All posts',
  filter: 'Filters',
  categories: 'Categories',
  tags: 'Tags',
  allCategories: 'All',
  searchPlaceholder: 'Search posts...',
  clearSearch: 'Clear search',
  totalWithPage: '{count} posts · Page {current}/{total}',
  totalOnly: '{count} posts',
  noResultsTitle: 'No matching posts',
  noResultsDesc: 'Try adjusting the filters or search keywords',
  clearFilters: 'Clear filters',
  loadErrorTitle: 'Failed to load posts',
  loadErrorDesc: 'Network error or the service is temporarily unavailable. Please refresh and try again later.',
  pagination: 'Pagination',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  pageN: 'Page {n}',
};

export default posts;
