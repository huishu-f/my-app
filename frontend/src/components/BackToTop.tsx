/**
 * @file BackToTop.tsx
 * @description 返回顶部悬浮按钮，滚动超过 400px 时淡入显现
 *              常挂载 + transition 状态切换：显示/隐藏双向平滑（200ms 档，全局动画规范），
 *              隐藏态经 visibility 延迟退场，不可聚焦、不可点击
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
  /** 是否可见 */
  const [visible, setVisible] = useState(false);

  useRafScroll((scrollY) => setVisible(scrollY > 400));

  return (
    /** 定位与显隐过渡由外层容器承担，按钮自身仅保留 hover 状态反馈（150ms 档） */
    <div
      className={`fixed bottom-6 left-6 z-40 transition-[opacity,visibility] duration-200 ease-out max-md:bottom-4 max-md:left-4 ${
        visible ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
      }`}
    >
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={t('backToTop')}
        tabIndex={visible ? 0 : -1}
        className="border-stroke bg-surface text-heading hover:bg-card-hover-bg flex h-11 w-11 items-center justify-center rounded-full border shadow-(--shadow-md) transition-[background-color,box-shadow] duration-150 ease-out hover:shadow-(--shadow-lg) max-md:h-10 max-md:w-10"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
