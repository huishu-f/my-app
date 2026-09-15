/**
 * @file error.tsx
 * @description 文章列表页错误边界，列表数据获取失败时展示错误提示与刷新入口；仅路由数据加载失败时触发
 */
'use client';

import { Search } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * PostsError 文章列表页错误边界
 * 列表数据获取失败时展示
 */
export default function PostsError() {
  return (
    <Container className="page-section">
      {/* 错误提示与刷新入口 */}
      <EmptyState
        icon={<Search size={20} strokeWidth={2.5} />}
        title="文章加载失败"
        description="网络异常或服务暂时不可用，请稍后刷新页面重试"
        action={
          <Button href="/posts" variant="ghost" size="sm">
            刷新页面
          </Button>
        }
      />
    </Container>
  );
}
