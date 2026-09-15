/**
 * @file Footer.tsx
 * @description 页脚组件，展示版权信息与站点标语
 */
import { useTranslations } from 'next-intl';
import { Container } from '../ui/Container';

/**
 * Footer 页脚
 */
export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer className="bg-page border-stroke border-t py-10">
      <Container className="text-muted flex flex-wrap items-center justify-between gap-4 text-(length:--type-sm) leading-normal max-md:flex-col max-md:gap-3 max-md:text-center">
        {/* 版权信息 */}
        <span className="inline-flex items-center font-medium tracking-[0.01em]">
          {t('copyright', { site: tNav('brand'), author: 'Alex Chen' })}
        </span>
        {/* 站点标语 */}
        <span className="display-serif text-muted text-(length:--type-md) tracking-wide">
          {t('tagline')}
        </span>
      </Container>
    </footer>
  );
}
