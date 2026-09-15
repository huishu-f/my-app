/**
 * home 模块 — 首页 Hero 与近期文章区
 */
const home = {
  brandSection: '品牌介绍',
  heroBadge: '多作者技术写作平台',
  codeComment: '// 鉴权守卫：Cookie 校验 + 注入 user',
  heroTitleLine1: '认真做事的人',
  heroTitlePrefix: '工程的',
  heroTitleEm: '深度笔记',
  heroLead: '聚焦架构与工程实践，记录值得反复读的思考。',
  browsePosts: '浏览文章',
  startWriting: '开始写作',
  latestSection: '近期文章',
  latestTitle: '近期文章',
  latestSubtitle: '最新发布的技术文章与工程实践',
  viewAll: '查看全部',
  viewAllCount: '查看全部 {count} 篇',
  loadErrorTitle: '文章加载失败',
  loadErrorDesc: '网络异常或服务暂时不可用，请稍后刷新页面重试',
};

export type Messages = typeof home;
export default home;
