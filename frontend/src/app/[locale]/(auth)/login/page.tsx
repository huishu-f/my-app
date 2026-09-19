/**
 * @file page.tsx
 * @description 登录页（/login）：邮箱+密码表单本地校验与提交，按接口错误码映射提示；支持 ?redirect= 参数登录后回跳原页面
 */
'use client';

import { useActionState, useState, Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Clock, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PasswordToggle } from '@/components/PasswordToggle';
import { Alert } from '@/components/ui/Alert';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import toast from '@/lib/toast';
import { isValidEmail } from '@/lib/validators';
import { useAuth } from '@/components/auth-provider';
import { authApi } from '@/services/auth/api';
import { ApiRequestError } from '@/lib/api/request';
import { safeRedirect } from '@/lib/navigation';

/**
 * 登录表单状态：两个字段各自的错误文案，null 表示无错误
 */
interface LoginState {
  /** 邮箱字段错误提示 */
  emailError: string | null;

  /** 密码字段错误提示 */
  pwdError: string | null;
}

/** useActionState 初始状态：两字段均无错误 */
const initialState: LoginState = { emailError: null, pwdError: null };

/**
 * 登录表单主体：内部使用 useSearchParams，必须由 LoginPage 包 Suspense 才能通过构建期预渲染检查
 */
function LoginContent() {
  const t = useTranslations('auth');

  const searchParams = useSearchParams();

  const { refreshMe } = useAuth();

  /** 登录成功后回跳地址（?redirect=），缺省回首页 */
  const redirectRaw = searchParams.get('redirect') || '/';

  /** 经 safeRedirect 过滤：只放行站内相对路径，防开放重定向 */
  const safeR = safeRedirect(redirectRaw);

  /** 是否明文显示密码 */
  const [showPassword, setShowPassword] = useState(false);

  /** 带 redirect 参数进入（多因未登录被拦截），顶部展示提示条 */
  const hasRedirect = searchParams.has('redirect');

  /**
   * 提交 action（useActionState）：本地校验邮箱/非空密码 → 调登录接口写 Cookie →
   * 刷新全局用户态 → 整页跳转到 redirect 目标；按错误码回填字段级提示
   */
  const [formState, formAction] = useActionState<LoginState, FormData>(async (_prev, formData) => {
    const email = (formData.get('email') as string)?.trim() ?? '';
    const password = (formData.get('password') as string) ?? '';

    // 先本地校验，失败时错误落在对应字段，不发请求
    if (!isValidEmail(email)) return { emailError: t('invalidEmail'), pwdError: null };
    if (!password) return { emailError: null, pwdError: t('emptyPwd') };

    try {
      await authApi.login({ email, password });
      try {
        await refreshMe();
      } catch {
        // 刷新用户态失败不阻断：登录 Cookie 已写入，随后的整页跳转必然拿到最新会话
      }
      toast.success(t('loginSuccess'));

      // 用 window.location.replace 整页跳转（非客户端路由）：让应用带新会话 Cookie 完整重载；replace 不留历史记录，防止后退回到登录页
      window.location.replace(safeR);
      return { emailError: null, pwdError: null };
    } catch (err) {
      // 按接口状态码映射文案：401→邮箱或密码错误；403→账号被禁用；其余 API 错误直接展示服务端 message
      if (err instanceof ApiRequestError) {
        if (err.isUnauthorized) return { emailError: null, pwdError: t('emailOrPwdError') };
        if (err.isForbidden) return { emailError: t('accountDisabled'), pwdError: null };
        return { emailError: err.message, pwdError: null };
      }
      return { emailError: null, pwdError: err instanceof Error ? err.message : t('loginFailed') };
    }
  }, initialState);

  return (
    <div className="auth-card">
      <div className="mb-10">
        <h1 className="auth-title">{t('loginTitle')}</h1>
        <p className="auth-subtitle">{t('loginSubtitle')}</p>
      </div>

      {hasRedirect && (
        <Alert variant="info" icon={<Info size={18} strokeWidth={2.5} />} className="mb-6">
          {t('redirectNotice')}
        </Alert>
      )}

      <form action={formAction} noValidate className="auth-form-stack">
        <FormField label={t('email')} error={formState.emailError ?? undefined}>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            autoComplete="email"
            defaultValue=""
            leftIcon={<Mail size={18} strokeWidth={2.5} />}
            error={!!formState.emailError}
          />
        </FormField>

        <FormField label={t('password')} error={formState.pwdError ?? undefined}>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('pwdPlaceholder')}
            autoComplete="current-password"
            defaultValue=""
            leftIcon={<Lock size={18} strokeWidth={2.5} />}
            rightElement={<PasswordToggle show={showPassword} onToggle={setShowPassword} />}
            error={!!formState.pwdError}
          />
        </FormField>

        <div className="text-right">
          <span className="text-muted text-(length:--type-2xs)">{t('forgotPwd')}</span>
        </div>

        <SubmitButton className="mt-1 w-full">{t('loginSubmit')}</SubmitButton>
      </form>

      <div className="auth-rate-hint">
        <Clock size={14} strokeWidth={2.5} />
        <span>{t('rateLimit')}</span>
      </div>

      <div className="auth-switch">
        {t('noAccount')}
        <Link href="/register" className="auth-switch-link">
          {t('registerNow')}
        </Link>
      </div>
    </div>
  );
}

/**
 * 登录页路由入口（/login）
 * LoginContent 依赖 useSearchParams，必须包 Suspense 边界才能静态预渲染
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
