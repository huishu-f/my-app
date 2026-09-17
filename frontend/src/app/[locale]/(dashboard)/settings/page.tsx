/**
 * @file page.tsx
 * @description 设置页（/settings）路由入口：服务端校验 locale 并取页头文案，表单交互交给客户端 SettingsForm
 */
import { Container } from '@/components/ui/Container';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { routing } from '@/i18n/routing';
import { SettingsForm } from './_components/SettingsForm';

/**
 * 设置页（Server Component）
 * @param props.params Next.js 15 的 Promise 形式动态段参数，含 [locale] 动态段
 */
export default async function SettingsPage({
  params,
}: {
  /** 路由参数：params.locale 为 [locale] 动态段 */
  params: Promise<{ locale: string }>;
}) {
  /** 非法语言路径直接 404，防止以未配置 locale 访问 */
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  /** 声明本次请求的 locale，使页面支持静态渲染 */
  setRequestLocale(locale);

  /** 服务端取 settings 命名空间文案，用于页头标题/副标题 */
  const t = await getTranslations('settings');
  return (
    <Container className="page-section">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <SettingsForm />
    </Container>
  );
}
