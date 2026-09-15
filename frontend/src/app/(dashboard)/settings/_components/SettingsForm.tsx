/**
 * @file SettingsForm.tsx
 * @description 账号设置表单（个人资料 + 修改密码），利用 React 19 useActionState
 *              管理提交状态，useFormStatus（SubmitButton）自动追踪 pending。
 */
'use client';

import { useActionState, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MapPin, Globe, Info, Check, Lock, Image as ImageIcon } from 'lucide-react';
import { PasswordToggle } from '@/components/PasswordToggle';
import toast from '@/lib/toast';
import { handleApiError } from '@/lib/error-toast';
import { Avatar } from '@/components/ui/Avatar';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordStrength } from '@/components/PasswordStrength';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/components/auth-provider';
import { clearAuthStatus } from '@/lib/auth-status';
import { authApi } from '@/services/auth/api';
import { ApiRequestError } from '@/lib/api/request';
import { getInitials } from '@/lib/format';
import type { SettingsTab } from '@my-app/shared';

/** SettingsForm 组件入参 */
interface SettingsFormProps {}

/**
 * 资料提交状态
 */
interface ProfileState {
  /** 提交错误提示文案 */
  error: string | null;
}

/**
 * 密码提交状态
 */
interface PasswordState {
  /** 提交错误提示文案 */
  error: string | null;
}

/** 资料表单初始状态 */
const initialProfileState: ProfileState = { error: null };
/** 密码表单初始状态 */
const initialPasswordState: PasswordState = { error: null };

/**
 * SettingsForm 账号设置表单
 * @param props {@link SettingsFormProps}
 */
export function SettingsForm({}: SettingsFormProps = {}) {
  const router = useRouter();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { user, refreshMe, setMe } = useAuth();

  /** 当前选中的设置标签页 */
  const [tab, setTab] = useState<SettingsTab>('profile');
  /** 名字输入值 */
  const [firstName, setFirstName] = useState('');
  /** 姓氏输入值 */
  const [lastName, setLastName] = useState('');
  /** 头像 URL 输入值 */
  const [avatar, setAvatar] = useState('');
  /** 个人简介输入值 */
  const [bio, setBio] = useState('');
  /** 所在地输入值 */
  const [location, setLocation] = useState('');
  /** 个人网站输入值 */
  const [website, setWebsite] = useState('');

  /** 当前密码输入值 */
  const [currentPwd, setCurrentPwd] = useState('');
  /** 新密码输入值 */
  const [newPwd, setNewPwd] = useState('');
  /** 确认新密码输入值 */
  const [confirmPwd, setConfirmPwd] = useState('');
  /** 当前密码明文显示状态 */
  const [showCurrent, setShowCurrent] = useState(false);
  /** 新密码明文显示状态 */
  const [showNew, setShowNew] = useState(false);
  /** 确认新密码明文显示状态 */
  const [showConfirm, setShowConfirm] = useState(false);

  /**
   * 用户信息加载后回填表单各字段
   */
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setAvatar(user.avatar ?? '');
    setBio(user.bio ?? '');
    setLocation(user.location ?? '');
    setWebsite(user.website ?? '');
  }, [user]);

  /** 资料提交 action — React 19 useActionState */
  const [, profileAction] = useActionState<ProfileState, FormData>(
    async (_prev, formData) => {
      const profile = {
        firstName: (formData.get('firstName') as string)?.trim() ?? '',
        lastName: (formData.get('lastName') as string)?.trim() ?? '',
        avatar: (formData.get('avatar') as string)?.trim() ?? '',
        bio: (formData.get('bio') as string)?.trim() ?? '',
        location: (formData.get('location') as string)?.trim() ?? '',
        website: (formData.get('website') as string)?.trim() ?? '',
      };
      try {
        await authApi.updateProfile(profile);
        try {
          await refreshMe();
        } catch {
          // 刷新失败不阻塞保存流程
        }
        toast.success(t('profileSaved'));
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('saveFailed');
        handleApiError(err as Error, t('saveFailed'));
        return { error: msg };
      }
    },
    initialProfileState,
  );

  /** 密码修改 action — React 19 useActionState */
  const [pwdState, pwdAction] = useActionState<PasswordState, FormData>(
    async (_prev, formData) => {
      const currentPassword = (formData.get('currentPwd') as string) ?? '';
      const newPassword = (formData.get('newPwd') as string) ?? '';
      const confirm = (formData.get('confirmPwd') as string) ?? '';

      if (newPassword.length < 6) return { error: t('pwdTooShort') };
      if (newPassword !== confirm) return { error: t('pwdMismatch') };
      if (newPassword === currentPassword) return { error: t('pwdSame') };

      try {
        await authApi.changePassword({ currentPassword, newPassword });
        setMe(null);
        clearAuthStatus();
        toast.success(t('pwdChanged'));
        // replace 而非 push：会话已清，返回键回 /settings 只会闪「请先登录」空态
        router.replace('/login');
        return { error: null };
      } catch (err) {
        if (err instanceof ApiRequestError && err.isUnauthorized) {
          return { error: t('pwdIncorrect') };
        }
        return { error: err instanceof Error ? err.message : t('pwdChangeFailed') };
      }
    },
    initialPasswordState,
  );

  /** 用户头像首字母缩写 */
  const userInitials = getInitials(firstName, lastName);
  const pwdError = pwdState.error;

  return (
    <div className="animate-fade-in">
      {/* 资料/密码分段切换 */}
      <div className="segmented mb-8">
        <button
          onClick={() => setTab('profile')}
          aria-pressed={tab === 'profile'}
          className={`segmented-item ${tab === 'profile' ? 'segmented-item-on' : ''}`}
        >
          {t('tabProfile')}
        </button>
        <button
          onClick={() => setTab('password')}
          aria-pressed={tab === 'password'}
          className={`segmented-item ${tab === 'password' ? 'segmented-item-on' : ''}`}
        >
          {t('tabPassword')}
        </button>
      </div>

      {/* 个人资料表单 */}
      {tab === 'profile' && (
        <form action={profileAction} className="form-stack">
          <div className="flex items-center gap-8">
            <Avatar
              initials={userInitials}
              src={avatar || undefined}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <FormField label={t('avatarUrl')} hint={t('avatarHint')}>
                <Input
                  id="avatar"
                  name="avatar"
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  maxLength={500}
                  leftIcon={<ImageIcon size={18} strokeWidth={2.5} />}
                  placeholder="https://example.com/avatar.png"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('firstName')} required>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={50}
              />
            </FormField>
            <FormField label={t('lastName')} required>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={50}
              />
            </FormField>
          </div>

          <FormField
            label={t('bio')}
            hint={t('bioHint')}
          >
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={4}
              className="textarea-field input-focus"
            />
            <div className="meta-text mt-1 text-right">{bio.length} / 280</div>
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('location')} hint={tCommon('optional')}>
              <Input
                id="location"
                name="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                leftIcon={<MapPin size={18} strokeWidth={2.5} />}
              />
            </FormField>
            <FormField label={t('website')} hint={tCommon('optional')}>
              <Input
                id="website"
                name="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={200}
                leftIcon={<Globe size={18} strokeWidth={2.5} />}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-4">
            <SubmitButton>
              <Check size={16} strokeWidth={2.5} />
              {t('saveChanges')}
            </SubmitButton>
          </div>
        </form>
      )}

      {/* 修改密码表单 */}
      {tab === 'password' && (
        <form action={pwdAction} className="form-stack">
          {/* 密码错误提示 */}
          {pwdError && (
            <Alert
              variant="error"
              icon={<Info size={16} strokeWidth={2.5} />}
              className="shake"
            >
              {pwdError}
            </Alert>
          )}

          <FormField label={t('currentPwd')} required>
            <Input
              id="currentPwd"
              name="currentPwd"
              type={showCurrent ? 'text' : 'password'}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
              leftIcon={<Lock size={18} strokeWidth={2.5} />}
              rightElement={<PasswordToggle show={showCurrent} onToggle={setShowCurrent} />}
            />
          </FormField>

          <FormField label={t('newPwd')} hint={t('newPwdHint')} required>
            <Input
              id="newPwd"
              name="newPwd"
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoComplete="new-password"
              leftIcon={<Lock size={18} strokeWidth={2.5} />}
              rightElement={<PasswordToggle show={showNew} onToggle={setShowNew} />}
            />
            <PasswordStrength password={newPwd} />
          </FormField>

          <FormField label={t('confirmPwd')} required>
            <Input
              id="confirmPwd"
              name="confirmPwd"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              leftIcon={<Lock size={18} strokeWidth={2.5} />}
              rightElement={<PasswordToggle show={showConfirm} onToggle={setShowConfirm} />}
            />
          </FormField>

          <div className="flex justify-end pt-4">
            <SubmitButton>
              <Check size={16} strokeWidth={2.5} />
              {t('updatePwd')}
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
