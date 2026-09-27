const post = {
  readingTime: "约 {minutes} 分钟",

  tocLabel: "文章目录",
  tocNav: "文章内导航",
  readingProgress: "阅读进度",
  toc: "目录",

  like: "点赞",
  liked: "已点赞",
  views: "浏览",
  likes: "点赞",
  favorite: "收藏",
  favorited: "已收藏",
  loginToLike: "登录后可点赞",
  loginToFavorite: "登录后可收藏",
  commentsCount: "{count} 条评论",

  editPost: "编辑文章",
  deletePost: "删除文章",
  deletePostDesc: "删除后无法恢复，文章及评论将被永久移除。",

  commentsTitle: "评论",
  commentPlaceholder: "写下你的想法…（⌘/Ctrl+Enter 发送）",
  commentEmpty: "请输入评论内容",
  submitComment: "发表评论",
  commentLoginBefore: "登录",
  commentLoginAfter: "后参与评论",
  commentLoadError: "评论加载失败",
  noCommentsTitle: "还没有评论",
  noCommentsDesc: "抢沙发！",
  loadMoreComments: "加载更多评论（剩 {count} 条）",
  deleteCommentTitle: "删除评论",
  deleteCommentDesc: "确认删除这条评论吗？此操作不可撤销。",
  confirmDeleteBtn: "确认删除",

  prevPost: "上一篇",
  nextPost: "下一篇",
};

export type Messages = typeof post;
export default post;
