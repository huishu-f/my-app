/**
 * @file page.tsx
 * @description 登录页，利用 React 19 useActionState 管理表单提交状态，
 *              useFormStatus（SubmitButton）自动追踪 pending
 *              表单使用 action prop 而非 onSubmit，action 函数接收 FormData
 *              拆分 LoginContent + Suspense 边界包裹 useSearchParams，避免 CSR bailout
 */
'use client';

import { useActionState, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Clock, Info } from 'lucide-react';
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

/** 登录表单状态（useActionState 返回值） */
interface LoginState {
  /** 邮箱字段错误提示 */
  emailError: string | null;
  /** 密码字段错误提示 */
  pwdError: string | null;
}

/** 初始状态 */
const initialState: LoginState = { emailError: null, pwdError: null };

/**
 * LoginContent 登录表单内容，含 useSearchParams，需被 Suspense 包裹
 */
function LoginContent() {
  const searchParams = useSearchParams();
  const { refreshMe } = useAuth();

  const redirect = searchParams.get('redirect') || '/';
  const safeRedirect =
    redirect.startsWith('/') &&
    !redirect.startsWith('//') &&
    !['/login', '/register'].includes(redirect)
      ? redirect
      : '/';

  /** 是否显示明文密码 */
  const [showPassword, setShowPassword] = useState(false);
  /** 是否由受保护页重定向而来 */
  const hasRedirect = searchParams.has('redirect');

/**
 * 表单提交 action — React 19 useActionState，接收 FormData 执行校验 + API 调用，返回表单状态
 */
  const [formState, formAction] = useActionState<LoginState, FormData>(
    async (_prev, formData) => {
      const email = (formData.get('email') as string)?.trim() ?? '';
      const password = (formData.get('password') as string) ?? '';

      // 客户端校验
      if (!isValidEmail(email)) return { emailError: '请输入有效的邮箱地址', pwdError: null };
      if (!password) return { emailError: null, pwdError: '请输入密码' };

      // API 调用
      try {
        await authApi.login({ email, password });
        try {
          await refreshMe();
        } catch {
          // me 请求失败不阻塞登录流程
        }
        toast.success('登录成功');
        // 登录成功后使用硬导航跳转：未登录时对 /write 的 RSC 导航会被 proxy 307 到 /login，
        // 该响应会污染客户端 Router Cache（/write 键下缓存了登录页 payload），
        // 导致登录后 push('/write') 命中污染缓存而落回登录页。硬导航绕开客户端缓存，确保可靠跳转
        window.location.replace(safeRedirect);
        return { emailError: null, pwdError: null };
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.isUnauthorized) return { emailError: null, pwdError: '邮箱或密码错误' };
          if (err.isForbidden) return { emailError: '账号已被禁用', pwdError: null };
          return { emailError: err.message, pwdError: null };
        }
        return { emailError: null, pwdError: err instanceof Error ? err.message : '登录失败' };
      }
    },
    initialState,
  );

  return (
    <div className="auth-card">
      {/* 标题区 */}
      <div className="mb-10">
        <h1 className="auth-title">欢迎回来</h1>
        <p className="auth-subtitle">登录你的账号以发布文章、评论与点赞。</p>
      </div>

      {/* 重定向提示 */}
      {hasRedirect && (
        <Alert variant="info" icon={<Info size={18} strokeWidth={2.5} />} className="mb-6">
          请先登录以继续访问目标页面
        </Alert>
      )}

      {/* 登录表单 */}
      <form action={formAction} noValidate className="auth-form-stack">
        <FormField label="邮箱" error={formState.emailError ?? undefined}>
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

        <FormField label="密码" error={formState.pwdError ?? undefined}>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="输入密码"
            autoComplete="current-password"
            defaultValue=""
            leftIcon={<Lock size={18} strokeWidth={2.5} />}
            rightElement={<PasswordToggle show={showPassword} onToggle={setShowPassword} />}
            error={!!formState.pwdError}
          />
        </FormField>

        <div className="text-right">
          <span className="text-muted text-(length:--type-xs)">忘记密码？请联系管理员重置</span>
        </div>

        <SubmitButton className="w-full mt-1">登录</SubmitButton>
      </form>

      {/* 限流提示 */}
      <div className="auth-rate-hint">
        <Clock size={13} strokeWidth={2.5} />
        <span>5 分钟内最多 5 次尝试</span>
      </div>

      {/* 注册引导 */}
      <div className="auth-switch">
        还没有账号？
        <Link href="/register" className="auth-switch-link">
          立即注册 →
        </Link>
      </div>
    </div>
  );
}

/**
 * LoginPage 登录页，Suspense 包裹 useSearchParams，避免静态生成 CSR bailout
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
