/**
 * @file 文章目录数据结构
 * @description 文章正文右侧目录（Table of Contents）导航的数据类型
 */

/**
 * 目录项
 * @description 文章内单个标题对应的目录条目
 */
export interface TocItem {
  /** 标题锚点 ID，点击目录项滚动到对应标题 */
  id: string;
  /** 标题文本 */
  text: string;
  /** 是否为子标题（h3 及以下层级） */
  sub: boolean;
}
