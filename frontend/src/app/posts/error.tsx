/**
 * @file error.tsx
 * @description 文章列表页错误边界，列表数据获取失败时展示错误提示与刷新入口；仅路由数据加载失败时触发
 */
'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * PostsError 文章列表页错误边界
 * 列表数据获取失败时展示
 */
export default function PostsError() {
  const t = useTranslations('errors');
  return (
    <Container className="page-section">
      {/* 错误提示与刷新入口 */}
      <div className="animate-fade-in">
        <EmptyState
          icon={<Search size={20} strokeWidth={2.5} />}
          title={t('postsErrorTitle')}
          description={t('postsErrorDesc')}
          action={
            <Button href="/posts" variant="ghost" size="sm">
              {t('reload')}
            </Button>
          }
        />
      </div>
    </Container>
  );
}
