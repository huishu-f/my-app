/**
 * @file page.tsx
 * @description 个人中心页：容器内渲染客户端内容组件
 *              （资料卡 + 我的文章/我的收藏 Tab），鉴权与数据获取均在客户端完成。
 */
import { Container } from '@/components/ui/Container';
import { ProfilePageContent } from './_components/ProfilePageContent';

/**
 * ProfilePage 个人中心页组件
 */
export default function ProfilePage() {
  return (
    <Container className="page-section">
      <ProfilePageContent />
    </Container>
  );
}
