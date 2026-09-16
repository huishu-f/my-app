/**
 * @file page.tsx
 * @description 账号设置页：渲染页头与客户端设置表单（个人资料/修改密码），
 *              用户数据由表单从 useAuth() 获取，页面本身可静态缓存。
 */
import { Container } from '@/components/ui/Container';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { routing } from '@/i18n/routing';
import { SettingsForm } from './_components/SettingsForm';

/**
 * SettingsPage 账号设置页组件
 * @param params.params 路由动态参数，含 locale
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  /** 解析并校验 locale，写入请求级存储以启用静态渲染 */
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /** 设置页文案翻译函数 */
  const t = await getTranslations('settings');
  return (
    <Container className="page-section">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <SettingsForm />
    </Container>
  );
}
