/**
 * @file error.tsx
 * @description 文章详情页错误边界：路由段渲染/数据异常时展示错误提示与返回列表入口
 */
'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * PostDetailError 文章详情页错误边界组件
 * 渲染加载失败提示与「返回文章列表」按钮
 */
export default function PostDetailError() {
  /** 错误文案翻译函数 */
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
