/**
 * @file error.tsx
 * @description /{locale} 段的错误边界：捕获其下任意子路由渲染期抛出的异常（不含请求/接口报错），提供重新加载、回首页与复制错误详情三个动作；Next 约定该文件必须是客户端组件
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import type { ErrorBoundaryProps } from '@my-app/shared';

/**
 * 局部错误兜底页：仍包裹在 [locale] 布局内，故导航、页脚与 i18n 文案可用（区别于 app/global-error.tsx）
 * @param props {@link ErrorBoundaryProps}
 */
export default function Error({ error, reset }: ErrorBoundaryProps) {
  /** errors 命名空间文案，语言由外层 NextIntlClientProvider 决定 */
  const t = useTranslations('errors');

  /** 复制成功标记，仅用于让按钮文案短暂切换到"已复制" */
  const [copied, setCopied] = useState(false);

  /**
   * 监听 error：详情只输出到控制台供排查，页面不渲染堆栈
   * 服务端渲染抛出的错误在生产构建下可能只带 digest 摘要，因此不作为展示依据
   */
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * 复制错误摘要到剪贴板，便于用户反馈：拼接错误名 + message + 堆栈 + 出错页面地址
   * clipboard 走可选链且 catch 静默：非安全上下文（http）或用户拒绝授权时不应再抛错打扰
   */
  const copyError = () => {
    const text = `${error.name}: ${error.message}\n${error.stack || ''}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        // 2000ms 后复原按钮文案，复制反馈只做一次性提示
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <Container className="page-section">
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-3xl) leading-tight font-bold">
          {t('errorTitle')}
        </h1>
        <p className="text-muted mb-10 max-w-100 text-(length:--type-base) leading-relaxed">
          {t('errorDesc')}
        </p>
        {/* 有意不展示 error.message 与堆栈：可能含内部信息，详情只走控制台和下面的复制按钮 */}
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
