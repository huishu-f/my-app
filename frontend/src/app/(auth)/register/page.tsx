/**
 * @file page.tsx
 * @description 注册页，利用 React 19 useActionState 管理表单提交状态，
 *              useFormStatus（SubmitButton）自动追踪 pending
 *              保留 5 字段实时校验（useState），表单提交用 action prop
 */
'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Clock, ArrowRight, User, UserPlus, Check, X } from 'lucide-react';
import { PasswordToggle } from '@/components/PasswordToggle';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordStrength } from '@/components/PasswordStrength';
import toast from '@/lib/toast';
import { isValidEmail, isValidUsername, isValidPassword } from '@/lib/validators';
import { authApi } from '@/services/auth/api';
import { ApiRequestError } from '@/lib/api/request';
import type { FieldId, FieldState } from '@my-app/shared';

/** 表单字段初始状态 */
const initialField: FieldState = { value: '', touched: false, valid: null };

/** 注册提交状态 */
interface RegisterState {
  /** 提交错误提示文案 */
  error: string | null;
}

/** 注册表单初始状态 */
const initialState: RegisterState = { error: null };

/**
 * 校验单个表单字段是否合法
 * @param id 字段标识 {@link FieldId}
 * @param value 待校验的字段值
 * @returns 是否校验通过
 */
function validateField(id: FieldId, value: string): boolean {
  const v = value;
  switch (id) {
    case 'firstName':
    case 'lastName':
      return v.trim().length >= 1 && v.trim().length <= 50;
    case 'username':
      return isValidUsername(v);
    case 'email':
      return isValidEmail(v);
    case 'password':
      return isValidPassword(v);
    default:
      return false;
  }
}

/** 各字段校验失败的错误提示文案 */
const errorMsgs: Record<FieldId, string> = {
  firstName: '1-50 个字符',
  lastName: '1-50 个字符',
  username: '仅允许字母、数字、下划线，3-30 字符',
  email: '请输入有效的邮箱地址',
  password: '密码至少 6 位',
};

/**
 * RegisterPage 注册页
 */
export default function RegisterPage() {
  const router = useRouter();

  /** 各表单字段的状态集合（实时校验用） */
  const [fields, setFields] = useState<Record<FieldId, FieldState>>({
    firstName: { ...initialField },
    lastName: { ...initialField },
    username: { ...initialField },
    email: { ...initialField },
    password: { ...initialField },
  });
  /** 是否显示明文密码 */
  const [showPassword, setShowPassword] = useState(false);

  /**
   * 更新表单字段值并触发实时校验
   * @param id 字段标识 {@link FieldId}
   * @param value 字段新值
   */
  const updateField = (id: FieldId, value: string) => {
    setFields((prev) => {
      const next = { ...prev };
      if (value.length === 0) {
        next[id] = { value: '', touched: false, valid: null };
      } else {
        next[id] = { value, touched: true, valid: validateField(id, value) };
      }
      return next;
    });
  };

  /**
   * 表单提交 action — React 19 useActionState
   */
  const [formState, formAction] = useActionState<RegisterState, FormData>(
    async (_prev, formData) => {
      const firstName = (formData.get('firstName') as string)?.trim() ?? '';
      const lastName = (formData.get('lastName') as string)?.trim() ?? '';
      const username = (formData.get('username') as string)?.trim() ?? '';
      const email = (formData.get('email') as string)?.trim() ?? '';
      const password = (formData.get('password') as string) ?? '';

      // 全量校验
      const fieldIds: FieldId[] = ['firstName', 'lastName', 'username', 'email', 'password'];
      for (const id of fieldIds) {
        const value = { firstName, lastName, username, email, password }[id];
        if (!value || !validateField(id, value)) {
          return { error: errorMsgs[id] };
        }
      }

      // API 调用
      try {
        await authApi.register({ firstName, lastName, username, email, password });
        toast.success('注册成功，请登录');
        router.push('/login');
        return { error: null };
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.status === 409) return { error: '邮箱或用户名已被注册' };
          if (err.details?.length) return { error: err.details.map((d) => d.message).join('；') };
          return { error: err.message };
        }
        return { error: err instanceof Error ? err.message : '注册失败，请重试' };
      }
    },
    initialState,
  );

  /**
   * 渲染字段校验状态图标
   * @param id 字段标识 {@link FieldId}
   * @returns 校验通过/失败图标，未校验时返回 null
   */
  const renderStatusIcon = (id: FieldId) => {
    const f = fields[id];
    if (f.valid === null) return null;
    return f.valid ? (
      <Check size={16} className="text-state-success" strokeWidth={3} />
    ) : (
      <X size={16} className="text-state-error" strokeWidth={3} />
    );
  };

  return (
    <div className="auth-card">
      {/* 标题区 */}
      <div className="mb-10">
        <h1 className="auth-title">创建账号</h1>
        <p className="auth-subtitle">注册后即可发布文章、评论与互动。</p>
      </div>

      {/* 提交错误提示 */}
      {formState.error && (
        <div className="mb-4 rounded-lg bg-state-error-bg px-4 py-2 text-(length:--type-sm) text-state-error">
          {formState.error}
        </div>
      )}

      {/* 注册表单 */}
      <form action={formAction} noValidate className="form-stack">
        {/* 名 + 姓 */}
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <FormField
            label="名"
            required
            error={fields.firstName.valid === false ? errorMsgs.firstName : undefined}
          >
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Alex"
              maxLength={50}
              autoComplete="given-name"
              value={fields.firstName.value}
              onChange={(e) => updateField('firstName', e.target.value)}
              leftIcon={<User size={18} strokeWidth={2.5} />}
              rightElement={<span>{renderStatusIcon('firstName')}</span>}
              error={fields.firstName.valid === false}
              success={fields.firstName.valid === true}
            />
          </FormField>

          <FormField
            label="姓"
            required
            error={fields.lastName.valid === false ? errorMsgs.lastName : undefined}
          >
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Chen"
              maxLength={50}
              autoComplete="family-name"
              value={fields.lastName.value}
              onChange={(e) => updateField('lastName', e.target.value)}
              leftIcon={<User size={18} strokeWidth={2.5} />}
              rightElement={<span>{renderStatusIcon('lastName')}</span>}
              error={fields.lastName.valid === false}
              success={fields.lastName.valid === true}
            />
          </FormField>
        </div>

        {/* 用户名 */}
        <FormField
          label="用户名"
          required
          hint="可用字母、数字、下划线，3-30 字符"
          error={fields.username.valid === false ? errorMsgs.username : undefined}
        >
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="alexchen"
            maxLength={30}
            autoComplete="username"
            value={fields.username.value}
            onChange={(e) => updateField('username', e.target.value)}
            leftIcon={<UserPlus size={18} strokeWidth={2.5} />}
            rightElement={<span>{renderStatusIcon('username')}</span>}
            error={fields.username.valid === false}
            success={fields.username.valid === true}
          />
        </FormField>

        {/* 邮箱 */}
        <FormField
          label="邮箱"
          required
          error={fields.email.valid === false ? errorMsgs.email : undefined}
        >
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            autoComplete="email"
            value={fields.email.value}
            onChange={(e) => updateField('email', e.target.value)}
            leftIcon={<Mail size={18} strokeWidth={2.5} />}
            rightElement={<span>{renderStatusIcon('email')}</span>}
            error={fields.email.valid === false}
            success={fields.email.valid === true}
          />
        </FormField>

        {/* 密码 */}
        <FormField
          label="密码"
          required
          error={fields.password.valid === false ? errorMsgs.password : undefined}
        >
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="至少 6 位"
            autoComplete="new-password"
            value={fields.password.value}
            onChange={(e) => updateField('password', e.target.value)}
            leftIcon={<Lock size={18} strokeWidth={2.5} />}
            rightElement={<PasswordToggle show={showPassword} onToggle={setShowPassword} />}
            error={fields.password.valid === false}
            success={fields.password.valid === true}
          />
          <PasswordStrength password={fields.password.value} />
        </FormField>

        <SubmitButton className="w-full mt-2">注册</SubmitButton>
      </form>

      {/* 限流提示 */}
      <div className="auth-rate-hint">
        <Clock size={13} strokeWidth={2.5} />
        <span>5 分钟内最多 5 次尝试</span>
      </div>

      {/* 登录引导 */}
      <div className="auth-switch">
        已有账号？
        <Link href="/login" className="auth-switch-link inline-flex items-center gap-0.5">
          立即登录 →
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
