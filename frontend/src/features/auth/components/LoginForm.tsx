/**
 * @file LoginForm.tsx
 * @description 登录表单客户端岛：重定向提示条 + 邮箱/密码字段 + 提交按钮。
 *
 * 从 /login 页拆出来的原因：原页面整页 `'use client'`，页壳（标题/说明/限流提示/切换链接）也随之下沉到客户端，
 * 在静态 HTML 里根本没有内容。现在页壳由 RSC 直接产出，只有这个表单需要水合。
 *
 * 该组件使用 useSearchParams，必须由页面里的 Suspense 边界包住才能通过构建期静态预渲染检查。
 */
'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PasswordToggle } from '@/ui/PasswordToggle';
import { Alert } from '@/ui/Alert';
import { SubmitButton } from '@/ui/SubmitButton';
import { FormField } from '@/ui/FormField';
import { Input } from '@/ui/Input';
import toast from '@/lib/toast';
import { isValidEmail } from '@my-app/shared/lib/validators';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '@/services/auth/read';
import { ApiRequestError } from '@/lib/request';
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
 * 登录表单客户端岛
 * @returns 重定向提示条与登录表单
 */
export function LoginForm() {
  const t = useTranslations('auth');

  const searchParams = useSearchParams();

  const { refreshMe } = useAuth();

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
      // safeRedirect 只放行站内相对路径，防开放重定向
      window.location.replace(safeRedirect(searchParams.get('redirect') || '/'));
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
    <>
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
    </>
  );
}
