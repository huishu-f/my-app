/**
 * @file page.tsx
 * @description 个人中心页（/profile）路由入口：服务端壳组件，在 Container 内渲染客户端内容 ProfilePageContent
 */
import { Container } from '@/components/ui/Container';
import { ProfilePageContent } from './_components/ProfilePageContent';

/**
 * 个人中心页面组件
 * 真实内容依赖登录态，由客户端组件 ProfilePageContent 渲染
 */
export default function ProfilePage() {
  return (
    <Container className="page-section">
      <ProfilePageContent />
    </Container>
  );
}
