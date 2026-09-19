/**
 * @file page.tsx
 * @description 个人中心页（/profile）：服务端解析登录态并直取「我的文章 / 草稿 / 收藏」，资料卡与列表全部 RSC 直出
 *
 * 本页依赖登录态（读 Cookie），因此不参与静态预渲染，按请求渲染。
 * 早期版本是空壳页 + 客户端 useEffect 串行取数：首屏要多等「JS 下载 → 水合 → 会话接口返回」两段网络瀑布，
 * 且为了筛出本人文章会把全站前 100 篇拉到浏览器里再过滤。现在改为服务端一次取齐。
 */
import { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { Container } from '@/ui/Container';
import { getCurrentUser } from '@/services/auth/load';
import { getProfileListsServer } from '@/services/blog/load';
import { ProfileCard } from '@/features/profile/components/ProfileCard';
import { ProfileTabs } from '@/features/profile/components/ProfileTabs';
import { redirect } from '@/i18n/navigation';

import { resolveLocaleParams } from '@/i18n/locale-params';

/**
 * 个人中心 SEO 元数据
 * @param props params.locale 决定元数据语言；必须先于任何 next-intl API 固定
 * @returns 拼接站点标题的 title
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await resolveLocaleParams(params);

  const t = await getTranslations('profile');
  const tMeta = await getTranslations('meta');
  return { title: `${t('title')} · ${tMeta('siteTitle')}` };
}

/**
 * 个人中心页主体
 * @param props params.locale 路由语言
 * @returns 资料卡 + 标签页的 RSC 渲染树；未登录时重定向到登录页并携带回跳地址
 */
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await resolveLocaleParams(params);

  // 服务端解析登录态：未登录直接跳登录页，避免先渲染空壳再由客户端跳转造成闪烁
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: '/login?redirect=/profile', locale });
    // 不可达：redirect 内部必抛异常（NEXT_REDIRECT）。此行只为让 TS 收窄 user 的非空类型
    return null;
  }

  // 三个列表已按 authorId 在服务端过滤，客户端不再收到他人文章
  const lists = await getProfileListsServer();

  return (
    <Container className="page-section">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[300px_1fr]">
        <ProfileCard user={user} />
        <ProfileTabs
          published={lists.published}
          drafts={lists.drafts}
          favorites={lists.favorites}
        />
      </div>
    </Container>
  );
}
