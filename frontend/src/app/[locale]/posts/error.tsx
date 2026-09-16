/**
 * @file error.tsx
 * @description 文章列表页错误边界：路由段数据（文章/分类/标签）获取失败时渲染，
 *              展示错误提示与刷新入口。
 */
'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * PostsError 文章列表页错误边界组件
 * 渲染加载失败提示与「刷新」按钮（跳回 /posts 清空筛选重试）
 */
export default function PostsError() {
  /** 错误文案翻译函数 */
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
            <Button href="/posts" variant="ghost">
              {t('reload')}
            </Button>
          }
        />
      </div>
    </Container>
  );
}
