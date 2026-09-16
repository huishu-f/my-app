/**
 * home 模块 — 首页 Hero 与近期文章区
 */
const home = {
  brandSection: '关于',
  heroBadge: '技术写作 · 工程笔记',
  codeComment: '// 鉴权守卫：Cookie 校验 + 注入 user',
  heroTitleLine1: '专注手艺的人',
  heroTitlePrefix: '工程的',
  heroTitleEm: '深度笔记',
  heroLead: '记录值得反复咀嚼的工程思考。',
  browsePosts: '浏览文章',
  startWriting: '开始写作',
  latestSection: '近期文章',
  latestTitle: '近期文章',
  latestSubtitle: '最新的工程思考与实践记录',
  viewAll: '查看全部',
  viewAllCount: '查看全部 {count} 篇',
  loadErrorTitle: '文章加载失败',
  loadErrorDesc: '网络异常或服务暂时不可用，请稍后刷新页面重试',
};

export type Messages = typeof home;
export default home;
