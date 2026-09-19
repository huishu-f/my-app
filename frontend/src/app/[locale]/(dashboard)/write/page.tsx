/**
 * @file page.tsx
 * @description 写作页（/write）路由入口：引入代码高亮主题后渲染 WriteEditor；新建与编辑共用本页，编辑态由 ?id= 参数区分
 */
/** 与文章预览区 highlight.js 输出的 hljs 类配套的语法高亮主题 */
import '@/styles/hljs-theme.css';
import { WriteEditor } from '@/features/write/components/WriteEditor';

/**
 * 写作页路由入口（/write）：编辑模式参数解析与全部交互在客户端组件 WriteEditor 内完成
 */
export default function WritePage() {
  return <WriteEditor />;
}
