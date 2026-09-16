/**
 * @file page.tsx
 * @description 个人中心页，聚合个人资料、我的文章、我的收藏三个模块
 */
import { Container } from '@/components/ui/Container';
import { ProfilePageContent } from './_components/ProfilePageContent';

/**
 * 个人中心页 — 鉴权由 AuthGate（客户端）完成，用户数据/文章/收藏由 ProfilePageContent 从客户端 API 获取
 */
export default function ProfilePage() {
  return (
    <Container className="page-section">
      <ProfilePageContent />
    </Container>
  );
}
