/**
 * @file BackToTop.tsx
 * @description 返回顶部悬浮按钮：滚动超过阈值后淡入显示，点击平滑滚回页面顶部
 */
'use client';

import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRafScroll } from '@/hooks/useRafScroll';

/**
 * BackToTop 返回顶部按钮
 */
export function BackToTop() {
  const t = useTranslations('common');

  /** 按钮是否可见（由滚动位置驱动） */
  const [visible, setVisible] = useState(false);

  /** 监听滚动位置（RAF 节流），超过 400px 显示按钮，否则隐藏 */
  useRafScroll((scrollY) => setVisible(scrollY > 400));

  return (
    <div
      className={`fixed bottom-6 left-6 z-(--z-sticky) transition-[opacity,visibility] duration-200 ease-out max-md:bottom-4 max-md:left-4 ${
        visible ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
      }`}
    >
      {/* tabIndex 随可见态切换：隐藏时移出 Tab 序列，避免键盘聚焦到不可见按钮 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={t('backToTop')}
        tabIndex={visible ? 0 : -1}
        className="border-stroke bg-card-bg text-heading hover:bg-btn-hover-bg flex h-11 w-11 items-center justify-center rounded-full border shadow-(--shadow-md) transition-[background-color,box-shadow] duration-150 ease-out hover:shadow-(--shadow-lg) max-md:h-10 max-md:w-10"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
