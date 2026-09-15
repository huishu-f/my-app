/**
 * @file error.tsx
 * @description 全局错误边界组件，捕获渲染异常并提供重新加载与返回首页入口
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import type { ErrorBoundaryProps } from '@my-app/shared';

/**
 * Error 全局错误页
 * @param error 错误对象信息
 * @param reset 重置错误边界并重新渲染页面的函数
 */
export default function Error({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('errors');
  /** 是否已复制错误信息 */
  const [copied, setCopied] = useState(false);

  /**
   * 渲染出错时输出错误日志到控制台
   */
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * 复制错误详情到剪贴板
   */
  const copyError = () => {
    const text = `${error.name}: ${error.message}\n${error.stack || ''}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <Container className="page-section">
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-6xl) leading-tight font-bold">
          {t('errorTitle')}
        </h1>
        <p className="text-muted mb-10 max-w-100 text-(length:--type-lg) leading-relaxed">
          {t('errorDesc')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>{t('reload')}</Button>
          <Button variant="ghost" href="/">
            {t('goHome')}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyError}>
            {copied ? t('copied') : t('copyError')}
          </Button>
        </div>
      </div>
    </Container>
  );
}
