/**
 * @file error.tsx
 * @description /posts/[id] 文章详情路由的 Next.js 错误边界（error.tsx）：详情页渲染抛错时展示空状态并提供返回列表入口
 */
'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function PostDetailError() {
  const t = useTranslations('errors');
  return (
    <Container className="page-section">
      <div className="animate-fade-in">
        <EmptyState
          icon={<AlertCircle size={20} strokeWidth={2.5} />}
          title={t('postErrorTitle')}
          description={t('postErrorDesc')}
          action={
            <Button href="/posts" variant="ghost">
              {t('backToList')}
            </Button>
          }
        />
      </div>
    </Container>
  );
}
