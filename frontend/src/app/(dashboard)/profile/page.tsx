/**
 * @file page.tsx
 * @description 个人中心页，聚合个人资料、我的文章、我的收藏三个模块
 */
import { MapPin, Globe, Calendar, Users, Check, PenLine } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { StatsGrid } from '@/components/ui/StatsGrid';

import { formatCount, getInitials } from '@/lib/format';
import type { Post } from '@my-app/shared';
import { ProfilePageContent } from './_components/ProfilePageContent';

/**
 * ProfilePage 个人中心页
 * 鉴权由 AuthGate（客户端）完成，用户数据/文章/收藏由 ProfilePageContent 从客户端 API 获取
 * 页面本身不调用 cookies() → 可被 ISR/Full Route Cache 缓存
 */
export default function ProfilePage() {
  return (
    <Container className="page-section">
      <ProfilePageContent />
    </Container>
  );
}
