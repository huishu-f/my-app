/**
 * @file error.tsx
 * @description locale 段错误边界：捕获本段页面渲染异常，
 *              提供重新加载、返回首页与复制错误详情三个操作入口。
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import type { ErrorBoundaryProps } from '@my-app/shared';

/**
 * Error 错误页组件
 * @param props.error 捕获到的错误对象
 * @param props.reset 重置错误边界并重新渲染的函数
 */
export default function Error({ error, reset }: ErrorBoundaryProps) {
  /** 错误文案翻译函数 */
  const t = useTranslations('errors');
  /** 是否已复制错误信息（控制按钮文案切换） */
  const [copied, setCopied] = useState(false);

  /**
   * 错误变化时输出到控制台，便于排查
   */
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * 复制错误详情（名称/堆栈/当前 URL）到剪贴板，成功后 2s 内展示「已复制」
   */
  const copyError = () => {
    /** 拼接错误名称、消息、堆栈与当前页面 URL */
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
      {/* 错误提示主体：标题 + 描述 */}
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-6xl) leading-tight font-bold">
          {t('errorTitle')}
        </h1>
        <p className="text-muted mb-10 max-w-100 text-(length:--type-lg) leading-relaxed">
          {t('errorDesc')}
        </p>
        {/* 操作按钮组：重新加载 / 返回首页 / 复制错误详情 */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>{t('reload')}</Button>
          <Button variant="ghost" href="/">
            {t('goHome')}
          </Button>
          <Button variant="ghost" onClick={copyError}>
            {copied ? t('copied') : t('copyError')}
          </Button>
        </div>
      </div>
    </Container>
  );
}
