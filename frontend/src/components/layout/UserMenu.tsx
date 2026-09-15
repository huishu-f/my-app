/**
 * @file UserMenu.tsx
 * @description 用户菜单 — Client 岛屿，包含登录/未登录状态、头像下拉菜单
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, PenLine, Settings, UserCircle } from 'lucide-react';
import toast from '@/lib/toast';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '@/components/auth-provider';
import { useLogout } from '@/services/auth/hooks';
import { getInitials } from '@/lib/format';

/** 用户下拉菜单项配置 */
const userMenuItems = [
  { href: '/profile', label: '个人中心', icon: UserCircle },
  { href: '/write', label: '写文章', icon: PenLine },
  { href: '/settings', label: '账号设置', icon: Settings },
];

/**
 * UserMenu 用户菜单，登录/未登录状态切换与头像下拉
 */
export function UserMenu() {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const isLoggedIn = !!user;
  const userMenuRef = useRef<HTMLDivElement>(null);
  /**
   * 菜单最近一次是否由 hover 引起展开（见 onClick 接管逻辑说明，修复 BUG-04）
   */
  const hoverOpenedRef = useRef(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('已登出');
        setUserMenuOpen(false);
        router.push('/');
      },
      onError: () => {
        toast.error('登出失败，请重试');
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
        aria-label="登录"
        className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-(length:--type-sm) font-medium leading-normal transition-[background-color,color] duration-150 max-md:w-9 max-md:px-0"
      >
        <User size={16} strokeWidth={2.5} className="h-4 w-4 shrink-0 max-md:hidden" />
        <User size={20} strokeWidth={2.5} className="hidden h-5 w-5 max-md:block" />
        <span className="max-md:hidden">登录</span>
      </Link>
    );
  }

  return (
    // 交互时序说明（修复 BUG-04：首次点击无响应）：
    // 鼠标移入容器会先触发 mouseenter 展开菜单，随后 click 若做无条件翻转会把菜单收回，
    // 表现为“第一次点击没反应、第二次才展开”；此前 onFocus 与 click 叠加也是同样竞争。
    // 因此：hover 展开时点击视为“接管控制权并保持展开”；非 hover 引起（键盘 Enter /
    // 点击已接管后再点）才执行翻转，toggle 能力完整保留
    <div
      ref={userMenuRef}
      className="relative"
      onMouseEnter={() => {
        hoverOpenedRef.current = true;
        setUserMenuOpen(true);
      }}
      onMouseLeave={() => {
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
        aria-label="用户菜单"
        aria-expanded={userMenuOpen}
        aria-haspopup="menu"
        className="ring-stroke/50 [@media(hover:hover)]:hover:bg-black/[0.04] dark:[@media(hover:hover)]:hover:bg-white/[0.08] flex h-9 w-9 items-center justify-center rounded-full transition-[box-shadow,background-color] duration-150 [@media(hover:hover)]:hover:ring-1"
      >
        <Avatar
          initials={getInitials(user?.firstName ?? '', user?.lastName ?? '')}
          src={user?.avatar || undefined}
          size="sm"
          alt={`${user?.firstName ?? ''} ${user?.lastName ?? ''}的头像`}
        />
      </button>

      {/* 用户下拉菜单 */}
      {userMenuOpen && (
        <div className="absolute top-full right-0 z-50 pt-2">
          <div className="border-card-border bg-page animate-fade-in w-56 overflow-hidden rounded-xl border shadow-lg shadow-black/[0.08]">
            {/* 用户信息头 */}
            <div className="row-sm px-3.5 py-3">
              <Avatar
                initials={getInitials(user?.firstName ?? '', user?.lastName ?? '')}
                src={user?.avatar || undefined}
                size="sm"
                alt={`${user?.firstName ?? ''} ${user?.lastName ?? ''}的头像`}
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

            {/* 菜单项 */}
            <div className="p-1.5">
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setUserMenuOpen(false)}
                    className="row-sm text-body hover:bg-surface hover:text-heading group rounded-lg px-2.5 py-1.5 text-(length:--type-sm) leading-normal font-medium transition-[background-color,color] duration-150"
                  >
                    <Icon
                      size={14}
                      strokeWidth={2.5}
                      className="text-faint group-hover:text-heading shrink-0 transition-colors duration-150"
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="border-stroke/60 mx-3 border-t" />

            {/* 退出登录 */}
            <div className="p-1.5">
              <button
                onClick={handleLogout}
                className="row-sm text-faint hover:bg-state-error-bg hover:text-state-error w-full rounded-lg px-2.5 py-1.5 text-(length:--type-sm) leading-normal font-medium transition-[background-color,color] duration-150"
              >
                <LogOut size={14} strokeWidth={2.5} className="shrink-0" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
