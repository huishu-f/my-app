/**
 * @file UserMenu.tsx
 * @description 用户菜单 — Client 岛屿，包含登录/未登录状态、头像下拉菜单
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, LogIn, PenLine, Settings, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '@/components/auth-provider';
import { useLogout } from '@/services/auth/hooks';
import { getInitials } from '@/lib/format';

/** 用户下拉菜单项配置（label 键指向 nav 命名空间） */
const userMenuItems = [
  { href: '/profile', labelKey: 'profile', icon: UserCircle },
  { href: '/write', labelKey: 'write', icon: PenLine },
  { href: '/settings', labelKey: 'settings', icon: Settings },
] as const;

/**
 * UserMenu 用户菜单，登录/未登录状态切换与头像下拉
 */
export function UserMenu() {
  const router = useRouter();
  const t = useTranslations('nav');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const isLoggedIn = !!user;
  const userMenuRef = useRef<HTMLDivElement>(null);
  /**
   * 菜单最近一次是否由 hover 引起展开（见 onClick 接管逻辑说明，修复 BUG-04）
   */
  const hoverOpenedRef = useRef(false);

  /** 用户展示名与头像缩写 */
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const initials = getInitials(user?.firstName ?? '', user?.lastName ?? '');

  const handleLogout = () => {
    // 先关菜单、先回首页，再发登出请求：
    // 若在受保护页（/profile 等）等登出完成再跳转，setMe(null) 会让 AuthGate
    // 先闪出「请先登录」空态、随后才跳首页（中间页闪现）。Navbar 不随路由卸载，
    // 登出完成后全局登录态在首页自然更新为游客态。
    // replace 而非 push：避免回退键返回已登出的受保护页
    setUserMenuOpen(false);
    router.replace('/');
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('logoutSuccess'));
      },
      onError: () => {
        toast.error(t('logoutFailed'));
      },
    });
  };

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [userMenuOpen]);

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        aria-label={t('login')}
        className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-(length:--type-sm) leading-normal font-medium transition-[background-color,color] duration-150 ease-out max-md:w-9 max-md:px-0"
      >
        {/* LogIn — 未登录态入口语义（人像 User 图标留给已登录头像场景） */}
        <LogIn size={16} strokeWidth={2.5} className="h-4 w-4 shrink-0 max-md:hidden" />
        <LogIn size={20} strokeWidth={2.5} className="hidden h-5 w-5 max-md:block" />
        <span className="max-md:hidden">{t('login')}</span>
      </Link>
    );
  }

  return (
    // 交互时序说明（修复 BUG-04：首次点击无响应）：
    // 鼠标移入容器会先触发 pointerenter 展开菜单，随后 click 若做无条件翻转会把菜单收回，
    // 表现为“第一次点击没反应、第二次才展开”；此前 onFocus 与 click 叠加也是同样竞争。
    // 因此：hover 展开时点击视为“接管控制权并保持展开”；非 hover 引起（键盘 Enter /
    // 点击已接管后再点）才执行翻转，toggle 能力完整保留。
    // hover 展开仅对 pointerType === 'mouse' 生效：触屏会模拟 mouseenter/mouseleave，
    // 点菜单项时容器先收到 leave 把浮层收起（pointer-events-none），click 落空穿透到
    // 页面内容上误触路由跳转，且点头像永远被“hover 接管”关不掉——门控后触屏纯点击 toggle
    <div
      ref={userMenuRef}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        hoverOpenedRef.current = true;
        setUserMenuOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        hoverOpenedRef.current = false;
        setUserMenuOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setUserMenuOpen(false);
        }
      }}
    >
      {/* 用户头像按钮 */}
      <button
        onClick={() => {
          if (hoverOpenedRef.current) {
            // 菜单正处于 hover 展开状态：本次点击接管控制权并保持展开，不翻转
            hoverOpenedRef.current = false;
            setUserMenuOpen(true);
          } else {
            setUserMenuOpen((v) => !v);
          }
        }}
        aria-label={t('userMenu')}
        aria-expanded={userMenuOpen}
        aria-haspopup="menu"
        className="ring-stroke/50 [@media(hover:hover)]:hover:bg-surface flex h-9 w-9 items-center justify-center rounded-full transition-[box-shadow,background-color] duration-150 ease-out [@media(hover:hover)]:hover:ring-1"
      >
        <Avatar
          initials={initials}
          src={user?.avatar || undefined}
          size="sm"
          alt={t('avatarAlt', { name: displayName })}
        />
      </button>

      {/* 用户下拉菜单 — 常挂载 + transition 双向切换（进出场对称，见全局动画规范）。
          右对齐贴头像（距屏幕右缘 16px）；移动端收窄宽度（w-52）、菜单项升到
          44px 触摸档 + 16px 字号，图标成列左对齐，信息头保持头像左、文案右的紧凑行 */}
      <div
        className={`absolute top-full right-0 z-50 pt-2 ${userMenuOpen ? '' : 'pointer-events-none'}`}
      >
        <div
          className={`border-card-border bg-page ease-smooth w-56 origin-top-right overflow-hidden rounded-xl border shadow-lg transition-[opacity,transform,visibility] duration-200 max-md:w-52 ${
            userMenuOpen ? 'visible scale-100 opacity-100' : 'invisible scale-[0.98] opacity-0'
          }`}
        >
          {/* 用户信息头 — 头像在左、姓名/用户名在右 */}
          <div className="row-sm px-3.5 py-3 max-md:py-3.5">
            <Avatar
              initials={initials}
              src={user?.avatar || undefined}
              size="sm"
              alt={t('avatarAlt', { name: displayName })}
            />
            <div className="min-w-0">
              <p className="text-heading m-0 truncate text-(length:--type-sm) leading-normal font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-faint m-0 truncate text-(length:--type-2xs) leading-normal">
                @{user?.username}
              </p>
            </div>
          </div>

          <div className="border-stroke/60 mx-3 border-t" />

          {/* 菜单项 — 左对齐，图标成列；移动端 44px 触摸目标 + 16px 字号 */}
          <div className="p-1.5">
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setUserMenuOpen(false)}
                  className="row-sm text-body hover:bg-surface hover:text-heading group rounded-lg px-2.5 py-1.5 text-(length:--type-sm) leading-normal font-medium transition-[background-color,color] duration-150 ease-out max-md:min-h-11 max-md:gap-2.5 max-md:px-3 max-md:text-(length:--type-md)"
                >
                  <Icon
                    size={14}
                    strokeWidth={2.5}
                    className="text-faint group-hover:text-heading h-3.5 w-3.5 shrink-0 transition-colors duration-150 ease-out max-md:h-4 max-md:w-4"
                  />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="border-stroke/60 mx-3 border-t" />

          {/* 退出登录 */}
          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="row-sm text-faint hover:bg-state-error-bg hover:text-state-error w-full rounded-lg px-2.5 py-1.5 text-(length:--type-sm) leading-normal font-medium transition-[background-color,color] duration-150 ease-out max-md:min-h-11 max-md:gap-2.5 max-md:px-3 max-md:text-(length:--type-md)"
            >
              <LogOut
                size={14}
                strokeWidth={2.5}
                className="h-3.5 w-3.5 shrink-0 max-md:h-4 max-md:w-4"
              />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
