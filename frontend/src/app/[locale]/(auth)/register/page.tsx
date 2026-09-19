/**
 * @file page.tsx
 * @description 注册页（/register）：服务端渲染页壳（标题/说明/限流提示/切换链接），表单作为客户端岛按需水合
 */

import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

import { resolveLocaleParams } from '@/i18n/locale-params';
import { Clock } from 'lucide-react';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

/**
 * 注册页路由入口（/register）
 *
 * 本组件是 RSC，不再带 `'use client'`：标题、说明、限流提示与"已有账号"链接因此直接进入静态 HTML，
 * 不必等 JS 下载完才可见。只有真正需要五字段实时校验状态的表单留在客户端岛（RegisterForm）。
 *
 * 语言合法性校验与 setRequestLocale 都收在 `resolveLocaleParams` 里，必须在 getTranslations 之前调用：
 * 少了它，本页会从「静态预渲染」变成「按请求渲染」（构建产物里由 static 变成 ƒ），且不会有任何报错。
 * @param props.params Next.js 的 Promise 形式动态段参数，含 [locale] 动态段
 * @returns 注册卡片
 */
export default async function RegisterPage({
  params,
}: {
  /** 路由参数：params.locale 为 [locale] 动态段 */
  params: Promise<{ locale: string }>;
}) {
  await resolveLocaleParams(params);

  const t = await getTranslations('auth');

  return (
    <div className="auth-card">
      <div className="mb-10">
        <h1 className="auth-title">{t('registerTitle')}</h1>
        <p className="auth-subtitle">{t('registerSubtitle')}</p>
      </div>

      {/* AuthGuard 只包住表单岛，不包整页：它的 loading 分支不渲染 children，包住整页会让页壳一起退出静态预渲染 */}
      <AuthGuard>
        <RegisterForm />
      </AuthGuard>

      <div className="auth-rate-hint">
        <Clock size={14} strokeWidth={2.5} />
        <span>{t('rateLimit')}</span>
      </div>

      <div className="auth-switch">
        {t('hasAccount')}
        <Link href="/login" className="auth-switch-link">
          {t('loginNow')}
        </Link>
      </div>
    </div>
  );
}
