/**
 * @file UserMenu.tsx
 * @description 桌面端账户入口：未登录显示登录按钮；已登录显示头像下拉，含个人信息、导航项与退出登录。
 *   支持鼠标悬停展开、点击/失焦/外点关闭；移动端不渲染（入口在 MobileMenu 抽屉内）
 */
'use client';

import { useId, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { LogIn, NotepadText, SquareArrowRightExit, BookUser, Columns3Cog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '@/components/auth-provider';
import { getInitials } from '@/lib/format';
import { useDismissable } from '@/hooks/useDismissable';
import { useLogoutRedirect } from '@/hooks/useLogoutRedirect';

/**
 * 已登录下拉中的导航项：href 为跳转路由，labelKey 对应 nav 文案键，icon 为 lucide 图标
 * @description 同时被移动端抽屉的账户组复用，保证两端的账户入口集合始终一致
 */
export const userMenuItems = [
  { href: '/profile', labelKey: 'profile', icon: BookUser },
  { href: '/write', labelKey: 'write', icon: NotepadText },
  { href: '/settings', labelKey: 'settings', icon: Columns3Cog },
] as const;

/**
 * 用户菜单（桌面端）
 */
export function UserMenu() {
  const t = useTranslations('nav');

  /** 下拉菜单是否展开 */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  /** 是否已登录（有用户信息即视为登录态） */
  const isLoggedIn = !!user;
  /** 下拉面板节点引用：用于判断点击/焦点是否落在菜单之外 */
  const userMenuRef = useRef<HTMLDivElement>(null);

  /** 标记本次展开是否由鼠标悬停触发，用于协调 hover 与 click，避免悬停展开后点击又立即收起 */
  const hoverOpenedRef = useRef(false);

  /** 面板 id：供触发按钮的 aria-controls 关联（useId 保证同页多实例唯一） */
  const panelId = useId();

  /** 展示用全名：拼接姓名并去空白，用于无障碍 alt */
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  /** 头像无图时展示的首字母缩写 */
  const initials = getInitials(user?.firstName ?? '', user?.lastName ?? '');

  /** 收起菜单并登出回首页 */
  const handleLogout = useLogoutRedirect(() => setUserMenuOpen(false));

  /** 展开时监听 ESC 与点击菜单外区域关闭 */
  useDismissable(userMenuOpen, () => setUserMenuOpen(false), [userMenuRef]);

  /** 登录态异步解析期间：先占住与头像按钮等宽（36px）的空位，避免宽「登录」胶囊闪现再收缩造成右对齐整组抖动 */
  if (loading && !user) {
    return <span aria-hidden="true" className="h-9 w-9 shrink-0" />;
  }

  // 未登录：仅渲染跳转到登录页的入口
  if (!isLoggedIn) {
    return (
      <Link href="/login" className="bar-btn">
        <LogIn size={18} strokeWidth={2.25} className="h-4.5 w-4.5 shrink-0" />
        {t('login')}
      </Link>
    );
  }

  return (
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
      {/* 触发按钮与同排主题/语言按钮共用 icon-btn-ghost：36px 方形、同一套悬停叠加与焦点环，
          不用圆形底，否则一排方形按钮里冒出个圆形热区，看着像没对齐 */}
      <button
        onClick={() => {
          if (hoverOpenedRef.current) {
            // 悬停已展开时，点击只负责「钉住」不收起
            hoverOpenedRef.current = false;
            setUserMenuOpen(true);
          } else {
            setUserMenuOpen((v) => !v);
          }
        }}
        aria-label={t('userMenu')}
        aria-expanded={userMenuOpen}
        aria-controls={panelId}
        className="icon-btn-ghost"
      >
        <Avatar
          initials={initials}
          src={user?.avatar || undefined}
          size="sm"
          alt={t('avatarAlt', { name: displayName })}
        />
      </button>

      {/* 下拉面板：pt-2 为触发按钮与面板之间留出鼠标移动的缓冲区（无 Gap 时指针移过去会先触发 pointerleave 收起）；
          层级取 --z-modal，与 Modal、移动抽屉同级但高于遮罩。
          面板本体是「链接列表」而非 ARIA menu（未实现方向键漫游，声称赞助 role="menu" 反而失实），
          故走 disclosure 模式：触发按钮用 aria-expanded + aria-controls 关联本面板 */}
      <div
        className={`absolute top-full right-0 z-(--z-modal) pt-2 ${userMenuOpen ? '' : 'pointer-events-none'}`}
      >
        <div
          id={panelId}
          className={`border-card-border bg-card-bg ease-smooth w-56 origin-top-right overflow-hidden rounded-xl border shadow-(--shadow-lg) transition-[opacity,scale,visibility] duration-200 ${
            userMenuOpen ? 'visible scale-100 opacity-100' : 'invisible scale-98 opacity-0'
          }`}
        >
          <div className="row-sm px-3.5 py-3">
            <Avatar
              initials={initials}
              src={user?.avatar || undefined}
              size="md"
              alt={t('avatarAlt', { name: displayName })}
            />
            <div className="min-w-0">
              <p className="text-heading m-0 truncate text-(length:--type-xs) leading-normal font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
              {/* 与移动抽屉身份块同字号：两端面板的条目字号必须同源，
                  否则同一套设计语言在 PC / 移动端会呈现出两种排版密度。
                  行高不刻意压——桌面面板是宽松的卡片头，不必迁就 48px 行网格（那是移动抽屉的约束） */}
              <p className="text-faint m-0 truncate text-(length:--type-xs) leading-normal">
                @{user?.username}
              </p>
            </div>
          </div>

          <div className="border-stroke/60 mx-3 border-t" />

          <div className="p-1.5">
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setUserMenuOpen(false)}
                  className="row-sm text-body hover:bg-btn-hover-bg hover:text-heading group min-h-9 rounded-md px-2.5 py-2 text-(length:--type-xs) leading-normal font-medium transition-[background-color,color] duration-150 ease-out"
                >
                  <Icon
                    size={16}
                    strokeWidth={2.25}
                    className="text-muted group-hover:text-heading h-4 w-4 shrink-0 transition-colors duration-150 ease-out"
                  />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="border-stroke/60 mx-3 border-t" />

          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="row-sm text-muted hover:bg-state-error-bg hover:text-state-error group min-h-9 w-full rounded-md px-2.5 py-2 text-(length:--type-xs) leading-normal font-medium transition-[background-color,color] duration-150 ease-out"
            >
              <SquareArrowRightExit
                size={16}
                strokeWidth={2.25}
                className="group-hover:text-state-error h-4 w-4 shrink-0 transition-colors duration-150 ease-out"
              />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
