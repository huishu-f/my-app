/**
 * @file page.tsx
 * @description 写文章/编辑文章页服务端入口：仅渲染客户端编辑器 WriteEditor，
 *              鉴权由 (dashboard) 布局的 AuthGate 完成，本页可静态缓存。
 */
import '@/app/styles/hljs-theme.css';
import { WriteEditor } from './_components/WriteEditor';

/**
 * WritePage 写文章/编辑文章页组件
 * @returns 客户端编辑器
 */
export default function WritePage() {
  return <WriteEditor />;
}
