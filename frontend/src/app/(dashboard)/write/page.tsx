/**
 * @file page.tsx
 * @description 写文章页服务端入口，渲染客户端编辑器
 */
import '@/app/styles/hljs-theme.css';
import { WriteEditor } from './_components/WriteEditor';

/**
 * WritePage 写文章/编辑文章页，鉴权由 AuthGate（客户端）完成，
 * 页面本身不调用 cookies() → 可被 ISR/Full Route Cache 缓存
 */
export default function WritePage() {
  return <WriteEditor />;
}
