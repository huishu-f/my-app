/**
 * @file SettingsForm.tsx
 * @description 账号设置表单（个人资料 + 修改密码），利用 React 19 useActionState
 *              管理提交状态，useFormStatus（SubmitButton）自动追踪 pending。
 */
'use client';

import { useActionState, useState, useEffect } from 'react';
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
        toast.success('资料已保存');
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '保存失败';
        handleApiError(err as Error, '保存失败');
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

      if (newPassword.length < 6) return { error: '新密码至少 6 位' };
      if (newPassword !== confirm) return { error: '两次密码不一致' };
      if (newPassword === currentPassword) return { error: '新密码不能与当前密码相同' };

      try {
        await authApi.changePassword({ currentPassword, newPassword });
        setMe(null);
        clearAuthStatus();
        toast.success('密码修改成功，请重新登录');
        router.push('/login');
        return { error: null };
      } catch (err) {
        if (err instanceof ApiRequestError && err.isUnauthorized) {
          return { error: '当前密码不正确' };
        }
        return { error: err instanceof Error ? err.message : '修改失败，请检查网络后重试' };
      }
    },
    initialPasswordState,
  );

  /** 用户头像首字母缩写 */
  const userInitials = getInitials(firstName, lastName);
  const pwdError = pwdState.error;

  return (
    <>
      {/* 资料/密码分段切换 */}
      <div className="segmented mb-8">
        <button
          onClick={() => setTab('profile')}
          aria-pressed={tab === 'profile'}
          className={`segmented-item ${tab === 'profile' ? 'segmented-item-on' : ''}`}
        >
          个人资料
        </button>
        <button
          onClick={() => setTab('password')}
          aria-pressed={tab === 'password'}
          className={`segmented-item ${tab === 'password' ? 'segmented-item-on' : ''}`}
        >
          修改密码
        </button>
      </div>

      {/* 个人资料表单 */}
      {tab === 'profile' && (
        <form action={profileAction} className="form-stack">
          <div className="anim-fade-up stagger-1 flex items-center gap-8">
            <Avatar
              initials={userInitials}
              src={avatar || undefined}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <FormField label="头像 URL" hint="粘贴图片链接，建议方形 256x256">
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

          <div className="anim-fade-up stagger-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="名" required>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={50}
              />
            </FormField>
            <FormField label="姓" required>
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
            label="个人简介"
            hint="简短的自我介绍，最多 280 字符"
            className="anim-fade-up stagger-3"
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

          <div className="anim-fade-up stagger-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="所在地" hint="可选">
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
            <FormField label="个人网站" hint="可选">
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

          <div className="anim-fade-up stagger-5 flex justify-end pt-4">
            <SubmitButton>
              <Check size={16} strokeWidth={2.5} />
              保存修改
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
              className="anim-fade-up stagger-1 shake"
            >
              {pwdError}
            </Alert>
          )}

          <FormField label="当前密码" required className="anim-fade-up stagger-1">
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

          <FormField label="新密码" hint="至少 6 位" required className="anim-fade-up stagger-2">
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

          <FormField label="确认新密码" required className="anim-fade-up stagger-3">
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

          <div className="anim-fade-up stagger-4 flex justify-end pt-4">
            <SubmitButton>
              <Check size={16} strokeWidth={2.5} />
              更新密码
            </SubmitButton>
          </div>
        </form>
      )}
    </>
  );
}
