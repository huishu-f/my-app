/**
 * @file page.tsx
 * @description 登录页，利用 React 19 useActionState 管理表单提交状态，
 *              useFormStatus（SubmitButton）自动追踪 pending
 *              表单使用 action prop 而非 onSubmit，action 函数接收 FormData
 *              拆分 LoginContent + Suspense 边界包裹 useSearchParams，避免 CSR bailout
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

/** 登录表单状态（useActionState 返回值） */
interface LoginState {
  /** 邮箱字段错误提示 */
  emailError: string | null;
  /** 密码字段错误提示 */
  pwdError: string | null;
}

/** 登录表单初始状态（无错误） */
const initialState: LoginState = { emailError: null, pwdError: null };

/**
 * LoginContent 登录表单内容，含 useSearchParams，需被 Suspense 包裹
 */
/**
 * LoginContent 登录表单内容（含 useSearchParams，须被 Suspense 包裹防止 CSR bailout）
 */
function LoginContent() {
  /** 认证文案翻译函数 */
  const t = useTranslations('auth');
  /** 通用文案翻译函数 */
  const tCommon = useTranslations('common');
  /** URL 搜索参数（读取 redirect） */
  const searchParams = useSearchParams();
  /** 登录态刷新方法（登录成功后拉取用户信息） */
  const { refreshMe } = useAuth();

  /** 原始重定向地址（默认首页） */
  const redirectRaw = searchParams.get('redirect') || '/';
  /** 校验后的安全重定向地址（仅允许站内路径） */
  const safeR = safeRedirect(redirectRaw);

  /** 是否显示明文密码 */
  const [showPassword, setShowPassword] = useState(false);
  /** 是否由受保护页重定向而来（展示提示条） */
  const hasRedirect = searchParams.has('redirect');

/**
 * 表单提交 action — React 19 useActionState，接收 FormData 执行校验 + API 调用，返回表单状态
 */
  const [formState, formAction] = useActionState<LoginState, FormData>(
    async (_prev, formData) => {
      const email = (formData.get('email') as string)?.trim() ?? '';
      const password = (formData.get('password') as string) ?? '';

      // 客户端校验
      if (!isValidEmail(email)) return { emailError: t('invalidEmail'), pwdError: null };
      if (!password) return { emailError: null, pwdError: t('emptyPwd') };

      // API 调用
      try {
        await authApi.login({ email, password });
        try {
          await refreshMe();
        } catch {
          // me 请求失败不阻塞登录流程
        }
        toast.success(t('loginSuccess'));
        // 登录成功后使用硬导航跳转：未登录时对 /write 的 RSC 导航会被 proxy 307 到 /login，
        // 该响应会污染客户端 Router Cache（/write 键下缓存了登录页 payload），
        // 导致登录后 push('/write') 命中污染缓存而落回登录页。硬导航绕开客户端缓存，确保可靠跳转
        window.location.replace(safeR);
        return { emailError: null, pwdError: null };
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.isUnauthorized) return { emailError: null, pwdError: t('emailOrPwdError') };
          if (err.isForbidden) return { emailError: t('accountDisabled'), pwdError: null };
          return { emailError: err.message, pwdError: null };
        }
        return { emailError: null, pwdError: err instanceof Error ? err.message : t('loginFailed') };
      }
    },
    initialState,
  );

  return (
    <div className="auth-card">
      {/* 标题区 */}
      <div className="mb-10">
        <h1 className="auth-title">{t('loginTitle')}</h1>
        <p className="auth-subtitle">{t('loginSubtitle')}</p>
      </div>

      {/* 重定向提示 */}
      {hasRedirect && (
        <Alert variant="info" icon={<Info size={18} strokeWidth={2.5} />} className="mb-6">
          {t('redirectNotice')}
        </Alert>
      )}

      {/* 登录表单 */}
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
          <span className="text-muted text-(length:--type-xs)">{t('forgotPwd')}</span>
        </div>

        <SubmitButton className="w-full mt-1">{t('loginSubmit')}</SubmitButton>
      </form>

      {/* 限流提示 */}
      <div className="auth-rate-hint">
        <Clock size={13} strokeWidth={2.5} />
        <span>{t('rateLimit')}</span>
      </div>

      {/* 注册引导 */}
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
 * LoginPage 登录页组件
 * 以 Suspense 包裹含 useSearchParams 的表单内容，避免静态生成时 CSR bailout
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
