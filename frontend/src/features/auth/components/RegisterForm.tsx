/**
 * @file RegisterForm.tsx
 * @description 注册表单客户端岛：姓名/用户名/邮箱/密码五字段实时校验与提交；重名（409）提示，成功后跳登录页。
 *
 * 从 /register 页拆出来的原因：原页面整页 `'use client'`，页壳（标题/说明/限流提示/切换链接）也随之下沉到客户端，
 * 在静态 HTML 里根本没有内容。现在页壳由 RSC 直接产出，只有这个表单需要水合。
 */
'use client';

import { useActionState, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Mail, Lock, User, UserPlus, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PasswordToggle } from '@/ui/PasswordToggle';
import { Alert } from '@/ui/Alert';
import { SubmitButton } from '@/ui/SubmitButton';
import { FormField } from '@/ui/FormField';
import { Input } from '@/ui/Input';
import { PasswordStrength } from '@/ui/PasswordStrength';
import toast from '@/lib/toast';
import { resolveApiErrorMessage } from '@/lib/error-toast';
import { isValidEmail, isValidUsername, isValidPassword } from '@my-app/shared/lib/validators';
import { authApi } from '@/services/auth/read';
import { ApiRequestError } from '@/lib/request';
import type { FieldId, FieldState } from '@my-app/shared';

/** 字段初始状态：空值、未触碰、未校验（valid 为 null 时不渲染对错图标） */
const initialField: FieldState = { value: '', touched: false, valid: null };

/**
 * 注册提交结果状态
 */
interface RegisterState {
  /** 全局错误文案（字段校验失败或接口报错），null 表示无错误 */
  error: string | null;
}

/** useActionState 初始状态：无错误 */
const initialState: RegisterState = { error: null };

/**
 * 按字段标识做本地格式校验
 * @param id 字段标识 {@link FieldId}
 * @param value 字段当前输入值
 * @returns 是否通过校验；名/姓要求 1-50 字符（单位: 字符），未识别字段恒为 false
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

/** 字段校验失败时对应的 i18n 错误文案 key（名/姓共用同一条） */
const errorMsgKeys: Record<FieldId, string> = {
  firstName: 'errNameLength',
  lastName: 'errNameLength',
  username: 'errUsername',
  email: 'invalidEmail',
  password: 'errPassword',
};

/**
 * 注册表单客户端岛
 * @returns 全局错误提示与注册表单
 */
export function RegisterForm() {
  const router = useRouter();

  const t = useTranslations('auth');

  /** 五个受控字段的实时状态（value/touched/valid，类型见 shared 的 {@link FieldState}） */
  const [fields, setFields] = useState<Record<FieldId, FieldState>>({
    firstName: { ...initialField },
    lastName: { ...initialField },
    username: { ...initialField },
    email: { ...initialField },
    password: { ...initialField },
  });

  /** 是否明文显示密码 */
  const [showPassword, setShowPassword] = useState(false);

  /**
   * 输入处理：清空时重置为"未触碰"（valid=null，不渲染错误/成功图标）；
   * 非空则即时校验并更新 valid，驱动 ✓/✗ 图标与字段报错
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
   * 提交 action（useActionState）：按字段顺序逐个本地校验，任一失败即中止并返回对应文案；
   * 全部通过才调注册接口，成功后跳转登录页（不自动登录）
   */
  const [formState, formAction] = useActionState<RegisterState, FormData>(
    async (_prev, formData) => {
      const firstName = (formData.get('firstName') as string)?.trim() ?? '';
      const lastName = (formData.get('lastName') as string)?.trim() ?? '';
      const username = (formData.get('username') as string)?.trim() ?? '';
      const email = (formData.get('email') as string)?.trim() ?? '';
      const password = (formData.get('password') as string) ?? '';

      // 校验顺序与表单展示顺序一致；空值或未通过校验的字段直接短路返回其错误文案
      const fieldIds: FieldId[] = ['firstName', 'lastName', 'username', 'email', 'password'];
      for (const id of fieldIds) {
        const value = { firstName, lastName, username, email, password }[id];
        if (!value || !validateField(id, value)) {
          return { error: t(errorMsgKeys[id] as never) };
        }
      }

      try {
        await authApi.register({ firstName, lastName, username, email, password });
        toast.success(t('registerSuccess'));

        // 成功后不自动建立会话，replace 跳登录页（不留历史，防止后退回到已注册的表单）
        router.replace('/login');
        return { error: null };
      } catch (err) {
        // 409：邮箱或用户名已被占用
        if (err instanceof ApiRequestError && err.status === 409) {
          return { error: t('duplicateAccount') };
        }
        return { error: resolveApiErrorMessage(err as Error, t('registerFailed')) };
      }
    },
    initialState,
  );

  /**
   * 字段校验态图标：未触碰（valid===null）不显示；通过绿勾 / 失败红叉
   * strokeWidth 取 3（全站默认 2.5）：16px 小字号下 2.5 的笔画在中文字重旁偏虚，加粗一档才与输入框文字重量相称
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
    <>
      {formState.error && (
        <Alert variant="error" className="mb-4">
          {formState.error}
        </Alert>
      )}

      <form action={formAction} noValidate className="auth-form-stack">
        {/* 姓名双列：断点跟 auth-card 自己的 480px 走，而不是全站的 max-md/max-sm——
            这里的约束是「卡片内宽」而非视口档位，且 440px 定宽卡片在 480~768px 视口下双列完全放得开 */}
        <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
          <FormField
            label={t('firstName')}
            required
            error={fields.firstName.valid === false ? t('errNameLength') : undefined}
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
            label={t('lastName')}
            required
            error={fields.lastName.valid === false ? t('errNameLength') : undefined}
          >
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Shu"
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

        <FormField
          label={t('username')}
          required
          hint={t('usernameHint')}
          error={fields.username.valid === false ? t('errUsername') : undefined}
        >
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="Hui"
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

        <FormField
          label={t('email')}
          required
          error={fields.email.valid === false ? t('invalidEmail') : undefined}
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

        <FormField
          label={t('password')}
          required
          error={fields.password.valid === false ? t('errPassword') : undefined}
        >
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('pwdPlaceholderMin')}
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

        <SubmitButton className="mt-2 w-full">{t('registerSubmit')}</SubmitButton>
      </form>
    </>
  );
}
