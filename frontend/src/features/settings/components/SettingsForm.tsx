/**
 * @file SettingsForm.tsx
 * @description 设置页（/settings）表单主体：「编辑资料」与「修改密码」两个标签；资料保存后即时同步全局用户态，改密成功会清空登录态并强制回登录页
 */
'use client';

import { useActionState, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { MapPin, Globe, Info, Check, Lock, Image as ImageIcon } from 'lucide-react';
import { PasswordToggle } from '@/ui/PasswordToggle';
import toast from '@/lib/toast';
import { resolveApiErrorMessage } from '@/lib/error-toast';
import { Avatar } from '@/ui/Avatar';
import { SubmitButton } from '@/ui/SubmitButton';
import { FormField } from '@/ui/FormField';
import { Input } from '@/ui/Input';
import { PasswordStrength } from '@/ui/PasswordStrength';
import { Alert } from '@/ui/Alert';
import { useAuth } from '@/providers/AuthProvider';
import { clearAuthStatus } from '@/lib/auth-status';
import { updateProfileAction, changePasswordAction } from '@/actions/auth';
import { unwrap } from '@/actions/unwrap';
import { ApiRequestError } from '@/lib/request';
import { getInitials } from '@/lib/format';
import { ALLOWED_IMAGE_HOSTS, isSafeImageUrl } from '@my-app/shared/lib/validators';

/** 表单提交结果：错误文案，null 表示无错误（资料与密码两个表单共用） */
type FormError = { error: string | null };

/**
 * 设置表单主体：受控字段 + useActionState 提交；依赖 useAuth 用户态，故为客户端组件
 */
export function SettingsForm() {
  const router = useRouter();

  const t = useTranslations('settings');

  const tCommon = useTranslations('common');

  const { user, refreshMe, setMe } = useAuth();

  /** 当前激活标签：profile=编辑资料 / password=修改密码 */
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  /** 名 */
  const [firstName, setFirstName] = useState('');

  /** 姓 */
  const [lastName, setLastName] = useState('');

  /** 头像 URL（需通过图片域名白名单校验） */
  const [avatar, setAvatar] = useState('');

  /** 个人简介 */
  const [bio, setBio] = useState('');

  /** 所在地 */
  const [location, setLocation] = useState('');

  /** 个人网站 */
  const [website, setWebsite] = useState('');

  /** 当前密码 */
  const [currentPwd, setCurrentPwd] = useState('');

  /** 新密码 */
  const [newPwd, setNewPwd] = useState('');

  /** 确认新密码 */
  const [confirmPwd, setConfirmPwd] = useState('');

  /** 当前密码是否明文显示 */
  const [showCurrent, setShowCurrent] = useState(false);

  /** 新密码是否明文显示 */
  const [showNew, setShowNew] = useState(false);

  /** 确认密码是否明文显示 */
  const [showConfirm, setShowConfirm] = useState(false);

  /** 监听 user：首次取到用户或被全局重新同步（保存资料、重新登录后）时回填表单；未登录跳过 */
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setAvatar(user.avatar ?? '');
    setBio(user.bio ?? '');
    setLocation(user.location ?? '');
    setWebsite(user.website ?? '');
  }, [user]);

  /**
   * 资料表单提交 action（useActionState）：trim 后整包调 updateProfile，
   * 成功后 refreshMe 同步顶栏头像等全局用户态；失败 toast 并回填错误
   */
  const [, profileAction] = useActionState<FormError, FormData>(
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
        await updateProfileAction(profile).then(unwrap);
        try {
          await refreshMe();
        } catch {
          // 同步本地用户态失败可忽略：数据已在服务端落库，下次拉取自然修正
        }
        toast.success(t('profileSaved'));
        return { error: null };
      } catch (err) {
        const msg = resolveApiErrorMessage(err as Error, t('saveFailed'));
        toast.error(msg);
        return { error: msg };
      }
    },
    { error: null },
  );

  /**
   * 修改密码提交 action：本地校验（新密码至少 6 位、两次输入一致、与当前密码不同）后调改密接口；
   * 成功后清空本地登录态并跳回登录页，要求用新密码重新登录
   */
  const [pwdState, pwdAction] = useActionState<FormError, FormData>(
    async (_prev, formData) => {
      const currentPassword = (formData.get('currentPwd') as string) ?? '';
      const newPassword = (formData.get('newPwd') as string) ?? '';
      const confirm = (formData.get('confirmPwd') as string) ?? '';

      if (newPassword.length < 6) return { error: t('pwdTooShort') };
      if (newPassword !== confirm) return { error: t('pwdMismatch') };
      if (newPassword === currentPassword) return { error: t('pwdSame') };

      try {
        await changePasswordAction({ currentPassword, newPassword }).then(unwrap);
        // 主动清空内存用户（setMe）与持久登录标记（clearAuthStatus），强制走重新登录流程
        setMe(null);
        clearAuthStatus();
        toast.success(t('pwdChanged'));

        // replace 跳转不留历史，防止后退回到设置页
        router.replace('/login');
        return { error: null };
      } catch (err) {
        // 401：当前密码校验不通过
        if (err instanceof ApiRequestError && err.isUnauthorized) {
          return { error: t('pwdIncorrect') };
        }
        return { error: err instanceof Error ? err.message : t('pwdChangeFailed') };
      }
    },
    { error: null },
  );

  /** 头像预览首字母，随名/姓输入实时联动 */
  const userInitials = getInitials(firstName, lastName);

  /** 改密表单错误文案，驱动密码 tab 顶部的 Alert */
  const pwdError = pwdState.error;

  /** 头像地址去掉首尾空白后的值 */
  const avatarUrl = avatar.trim();
  /** 空值视为合法（允许清空头像）；非空必须命中 isSafeImageUrl 的图片域名白名单，非法时输入框标红报错 */
  const avatarAllowed = avatarUrl === '' || isSafeImageUrl(avatarUrl);

  return (
    <div className="animate-fade-in">
      <div className="segmented mb-8">
        <button
          type="button"
          onClick={() => setTab('profile')}
          aria-pressed={tab === 'profile'}
          className={`segmented-item ${tab === 'profile' ? 'segmented-item-on' : ''}`}
        >
          {t('tabProfile')}
        </button>
        <button
          type="button"
          onClick={() => setTab('password')}
          aria-pressed={tab === 'password'}
          className={`segmented-item ${tab === 'password' ? 'segmented-item-on' : ''}`}
        >
          {t('tabPassword')}
        </button>
      </div>

      {tab === 'profile' && (
        <form action={profileAction} className="form-stack">
          <div className="flex items-center gap-8">
            <Avatar
              initials={userInitials}
              src={avatarUrl || undefined}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <FormField
                label={t('avatarUrl')}
                hint={t('avatarHint')}
                error={
                  avatarAllowed
                    ? undefined
                    : t('avatarInvalid', { hosts: ALLOWED_IMAGE_HOSTS.join(' / ') })
                }
              >
                <Input
                  id="avatar"
                  name="avatar"
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  maxLength={500}
                  error={!avatarAllowed}
                  aria-invalid={!avatarAllowed}
                  leftIcon={<ImageIcon size={18} strokeWidth={2.5} />}
                  placeholder={`https://${ALLOWED_IMAGE_HOSTS[0]}/…`}
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

          <FormField label={t('bio')} hint={t('bioHint')}>
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

      {tab === 'password' && (
        <form action={pwdAction} className="form-stack">
          {pwdError && (
            <Alert variant="error" icon={<Info size={16} strokeWidth={2.5} />} className="shake">
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
