/**
 * @file page.tsx
 * @description 账号设置页，渲染客户端表单
 */
import { Container } from '@/components/ui/Container';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { routing } from '@/i18n/routing';
import { SettingsForm } from './_components/SettingsForm';

/**
 * SettingsPage 账号设置页，鉴权由 AuthGate（客户端）完成，
 * 用户数据由 SettingsForm 从 useAuth() 获取，
 * 页面本身不调用 cookies() → 可被 ISR/Full Route Cache 缓存
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('settings');
  return (
    <Container className="page-section">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <SettingsForm />
    </Container>
  );
}
