/**
 * @file error.tsx
 * @description /posts 文章列表路由的 Next.js 错误边界（error.tsx）：列表渲染抛错时展示空状态并提供回列表的重载入口
 */
'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/ui/Container';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';

export default function PostsError() {
  const t = useTranslations('errors');
  return (
    <Container className="page-section">
      <div className="animate-fade-in">
        <EmptyState
          icon={<Search size={20} strokeWidth={2.5} />}
          title={t('postsErrorTitle')}
          description={t('postsErrorDesc')}
          action={
            <Button href="/posts" variant="ghost">
              {t('reload')}
            </Button>
          }
        />
      </div>
    </Container>
  );
}
