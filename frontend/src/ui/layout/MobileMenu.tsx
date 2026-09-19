/**
 * @file MobileMenu.tsx
 * @description 移动端导航抽屉：汉堡按钮切换浮起式卡片面板，内容按主次分五组——
 *   身份（仅登录态）/ 站内导航（主级）/ 账户 / 偏好 / 退出登录（仅登录态）；
 *   顶栏在移动端只保留品牌与菜单开关，主题、语言、账户入口全部收进抽屉，避免顶栏挤下一排控件；
 *   遮罩与面板经 Portal 挂载至 body，支持外点/ESC 关闭、背景滚动锁定与焦点进出管理
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePathname } from '@/i18n/navigation';
import { Menu, X, FileText, Home, LogIn, SquareArrowRightExit, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NAV_LINKS } from '@/config/site';
import { isRouteActive } from '@/lib/navigation';
import { useDismissable } from '@/hooks/useDismissable';
import { useLogoutRedirect } from '@/hooks/useLogoutRedirect';
import { Avatar } from '@/ui/Avatar';
import { useAuth } from '@/providers/AuthProvider';
import { getInitials } from '@/lib/format';
import { ThemeGlyph, useThemeMode } from '@/ui/ThemeToggle';
import { LocaleGlyph, LOCALE_LABELS, useLocaleSwitch } from '@/ui/layout/LanguageToggle';
import { userMenuItems } from '@/ui/layout/UserMenu';

/** 抽屉导航行图标：按 NAV_LINKS 的 key 取用；桌面导航保持纯文字，图标只在抽屉里做扫读辅助 */
const NAV_ICONS = { home: Home, posts: FileText } as const;

/** 抽屉行图标统一尺寸与线宽，与顶栏图标按钮取齐 */
const ROW_ICON = { size: 18, strokeWidth: 2.25, className: 'h-4.5 w-4.5 shrink-0' } as const;

/**
 * 移动端导航菜单
 */
export function MobileMenu() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { user, loading } = useAuth();
  const { isDark, setDark } = useThemeMode();
  const { locale, next, isPending, switchTo } = useLocaleSwitch();

  /** 抽屉是否展开 */
  const [mobileOpen, setMobileOpen] = useState(false);

  /** 是否已挂载：确保 createPortal 仅在客户端执行，规避 SSR 无 document 报错 */
  const [mounted, setMounted] = useState(false);

  /** 抽屉容器引用，供 useDismissable 判定点击是否落在浮层之外 */
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  /** 汉堡按钮引用：点击按钮本身不算"外部点击"，避免开合相互抵消；也是关闭后焦点的归还目标 */
  const toggleRef = useRef<HTMLButtonElement>(null);

  /** 上一帧的展开态：用于区分「本次是关闭动作」才归还焦点，避免首帧误抢焦点 */
  const wasOpenRef = useRef(false);

  /** 是否已登录（有用户信息即视为登录态） */
  const isLoggedIn = !!user;

  /** 展示用全名：拼接姓名并去空白 */
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  /** 头像无图时展示的首字母缩写 */
  const initials = getInitials(user?.firstName ?? '', user?.lastName ?? '');

  /** 收起抽屉 */
  const close = () => setMobileOpen(false);

  /** 收起抽屉并登出回首页 */
  const handleLogout = useLogoutRedirect(close);

  /** 判断某导航项是否命中当前路由 */
  const isActive = (href: string) => isRouteActive(pathname, href);

  /**
   * 挂载后执行一次：置 mounted 为真，使下方依赖 document 的 Portal 才在客户端渲染
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 浮层关闭交互：mobileOpen 为真时监听 ESC 与点击浮层外关闭；
   * refs 含抽屉与按钮，点击两者之外才关闭；lockScroll 展开时锁定背景滚动
   */
  useDismissable(mobileOpen, close, [mobileMenuRef, toggleRef], {
    lockScroll: true,
  });

  /**
   * 焦点管理：展开时把焦点移入抽屉（抽屉是 Portal 到 body 末尾的，不主动移入的话
   * 键盘用户要从汉堡按钮穿过整页才能到达菜单项）；关闭时归还给汉堡按钮
   */
  useEffect(() => {
    if (mobileOpen) {
      mobileMenuRef.current?.focus();
    } else if (wasOpenRef.current) {
      toggleRef.current?.focus();
    }
    wasOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  return (
    <>
      {/* 汉堡开关按钮：仅 max-md 显示，aria-label 随展开态在"打开/关闭"文案间切换 */}
      <button
        ref={toggleRef}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
        aria-expanded={mobileOpen}
        className="icon-btn-ghost hidden max-md:flex"
      >
        {/* 按展开态直接切换图标：交叉淡入双图标在过渡期间会同时可见形成重影 */}
        {mobileOpen ? <X {...ROW_ICON} /> : <Menu {...ROW_ICON} />}
      </button>

      {/* 点击关闭的半透明遮罩：挂载后经 Portal 挂到 body，用透明度/visibility 过渡显隐；
          层级取 --z-overlay（须低于抽屉面板的 --z-modal），顶部让出导航高度 --nav-h */}
      {mounted &&
        createPortal(
          <div
            className={`modal-overlay fixed top-(--nav-h) right-0 bottom-0 left-0 z-(--z-overlay) transition-[opacity,visibility] duration-200 ease-out ${
              mobileOpen
                ? 'pointer-events-auto visible opacity-100'
                : 'pointer-events-none invisible opacity-0'
            }`}
            onClick={close}
            aria-hidden="true"
          />,
          document.body,
        )}

      {/* 抽屉主体：关闭时仍留在 DOM 内以保留过渡动画，用 inert/aria-hidden 使其不可聚焦、对辅助技术隐藏；
          面板是浮在遮罩上的一张卡片（见 mobile-sheet），并非与页面齐平的整幅色块 */}
      {mounted &&
        createPortal(
          <div
            ref={mobileMenuRef}
            tabIndex={-1}
            aria-hidden={!mobileOpen}
            inert={!mobileOpen ? true : undefined}
            className={`mobile-sheet transition-[opacity,visibility,translate] duration-200 ease-out ${
              mobileOpen
                ? 'visible translate-y-0 opacity-100'
                : 'invisible -translate-y-1 opacity-0'
            }`}
          >
            {/* 身份块（仅登录态）：抽屉顶部先说明「你是谁」。
                未登录时该位置留空，登录入口挪到主导航之后与登录态的账户组同位（见下方分组顺序） */}
            {isLoggedIn && (
              <Link href="/profile" onClick={close} className="sheet-identity">
                <Avatar
                  initials={initials}
                  src={user?.avatar || undefined}
                  size="lg"
                  alt={t('avatarAlt', { name: displayName })}
                />
                {/* 两行同字号、同行高：面板里只允许一个字号，主次交给颜色（heading / faint）与字重。
                    行高取 snug（14px×1.35×2 行 = 37.8px）而非 normal——normal 下两行 42px 会顶过头像的 40px，
                    把身份块从 48px 撑到 50px，与主级行错开那 2px */}
                <span className="min-w-0">
                  <span className="text-heading block truncate text-(length:--type-xs) leading-snug font-semibold">
                    {displayName}
                  </span>
                  <span className="text-faint block truncate text-(length:--type-xs) leading-snug">
                    @{user?.username}
                  </span>
                </span>
              </Link>
            )}

            {/* 主级组：站内导航。整张面板里最重的一层，且排在最前——
                菜单的第一件事是「去哪」，账户与偏好都往后排 */}
            <div className="sheet-group">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                const Icon = NAV_ICONS[link.key];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={close}
                    className={active ? 'sheet-item sheet-item-on' : 'sheet-item'}
                  >
                    <Icon {...ROW_ICON} />
                    {t(link.key)}
                  </Link>
                );
              })}
            </div>

            {/* 次级组：账户。登录态与未登录态占同一个位置、用同一档行样式，
                两套状态的骨架因此完全对齐；登录态条目与桌面端下拉同源（userMenuItems），两端入口集合一致 */}
            {isLoggedIn ? (
              <div className="sheet-group">
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className="sheet-item-sub"
                    >
                      <Icon {...ROW_ICON} />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            ) : (
              !loading && (
                <div className="sheet-group">
                  <Link href="/login" onClick={close} className="sheet-item-sub">
                    <LogIn {...ROW_ICON} />
                    {t('login')}
                  </Link>
                  <Link href="/register" onClick={close} className="sheet-item-sub">
                    <UserPlus {...ROW_ICON} />
                    {t('register')}
                  </Link>
                </div>
              )
            )}

            {/* 次级组：偏好。主题与语言排在最后——它们是设置项而不是目的地，行尾显示当前档位；
                交互沿用桌面端图标按钮的「点击切到另一档」，不另做一套分段控件，
                免得同一个功能在两端有两种操作方式 */}
            <div className="sheet-group">
              <button onClick={() => setDark(!isDark)} className="sheet-item-sub">
                <ThemeGlyph isDark={isDark} />
                {t('theme')}
                <span className="sheet-value">{isDark ? t('themeDark') : t('themeLight')}</span>
              </button>
              <button
                onClick={() => switchTo(next)}
                disabled={isPending}
                className="sheet-item-sub disabled:opacity-50"
              >
                <LocaleGlyph locale={locale} />
                {t('language')}
                <span className="sheet-value">{LOCALE_LABELS[locale]}</span>
              </button>
            </div>

            {/* 次级组：退出登录。破坏性动作单独成组、压在全panel 最后——它离身份块最远，
                误触代价最高，与桌面下拉「分隔线 + 退出」收尾的排法也一致；
                单独成组是为了独占一条分隔线，不跟主题/语言挤在同一格里 */}
            {isLoggedIn && (
              <div className="sheet-group">
                <button onClick={handleLogout} className="sheet-item-sub sheet-item-danger">
                  <SquareArrowRightExit {...ROW_ICON} />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
