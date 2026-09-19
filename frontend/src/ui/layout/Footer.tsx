/**
 * @file Footer.tsx
 * @description 页脚组件：展示版权信息与站点标语，文案随语言切换（next-intl）
 */
import { useTranslations } from 'next-intl';
import { Container } from '@/ui/Container';

/**
 * 站点页脚
 */
export function Footer() {
  /** footer 命名空间文案 */
  const t = useTranslations('footer');
  /** nav 命名空间文案，用于复用品牌名 */
  const tNav = useTranslations('nav');

  return (
    <footer className="bg-page border-stroke border-t py-10">
      <Container className="text-muted flex flex-wrap items-center justify-between gap-4 text-(length:--type-xs) leading-normal max-md:flex-col max-md:gap-3 max-md:text-center">
        {/* 版权行：站点名取自 nav 文案，作者为固定字面量（非 i18n 维护） */}
        <span className="inline-flex items-center font-medium tracking-[0.01em]">
          {t('copyright', { site: tNav('brand'), author: 'Hui Shu' })}
        </span>
        <span className="display-serif text-muted text-(length:--type-base) tracking-wide">
          {t('tagline')}
        </span>
      </Container>
    </footer>
  );
}
