/**
 * @file WriteCta.tsx
 * @description 首页"开始写作"行动按钮：跳转到写作页 /write 的引导入口
 */
import { useTranslations } from 'next-intl';
import { Button } from './ui/Button';

/**
 * WriteCta 开始写作引导按钮
 */
export function WriteCta() {
  const t = useTranslations('home');

  return (
    <Button href="/write" variant="outline" size="lg">
      {t('startWriting')}
    </Button>
  );
}
