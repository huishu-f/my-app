/**
 * @file auth.ts
 * @description 账号写操作的 Server Action：更新个人资料、修改密码。
 *
 * 为什么也走 Action：`/settings` 页壳是静态预渲染的，真实数据靠客户端取。资料与密码是
 * 「同源 UI 的写」，改完要立刻反映到顶栏与站点其它位置，只有 Action 内的重验证能在同一次往返里
 * 同时清掉服务端缓存与浏览器 Router Cache。
 *
 * `/api/auth/profile` 与 `/api/auth/change-password` 保留为对外数据接口，共用同一 authService。
 */
'use server';

import { cookies } from 'next/headers';
import { getContainer, toSafeUser } from '@my-app/backend/container';
import { UnauthorizedError } from '@my-app/backend/errors';
import {
  parseChangePasswordBody,
  parseUpdateProfileBody,
} from '@my-app/backend/modules/auth/auth-validators';
import { getAuthPayload } from '@/services/auth/load';
import { runMutation, toFailure, type ActionResult } from '@/actions/run';
import type { AuthUserResponse, ChangePasswordDto, UpdateProfileDto } from '@my-app/shared';

/**
 * 更新当前登录用户的资料并返回脱敏结果
 * @param input 可修改的资料字段（昵称、头像、简介、所在地、个人网站）
 * @returns 成功返回 { user }（toSafeUser 脱敏后的字段）；未登录 401、参数非法 400
 */
export async function updateProfileAction(
  input: UpdateProfileDto,
): Promise<ActionResult<AuthUserResponse>> {
  return runMutation(async (user) => {
    const dto = parseUpdateProfileBody(input);
    const { authService } = getContainer();
    const updated = await authService.updateProfile(user.id, dto);
    // 资料字段是**冗余写进**文章（authorName）与评论（userName / userAvatar）的，改完必须让列表与
    // 详情的数据缓存一起作废，否则站内口径要等一个 revalidate 周期才统一。
    // 不传 postId：受影响的是「该用户的全部文章与评论」，无法枚举 id，只能按列表级失效处理。
    return { data: { user: toSafeUser(updated) } };
  });
}

/**
 * 修改当前登录用户的密码，成功后清除鉴权 Cookie 要求重新登录
 * @param input 原密码与新密码
 * @returns 成功返回 data 为 null；未登录或当前密码错误 401、参数非法 400
 * @description 不走 runMutation：改密不影响任何文章缓存，但需要在同一次往返里写 Cookie。
 */
export async function changePasswordAction(input: ChangePasswordDto): Promise<ActionResult<null>> {
  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const dto = parseChangePasswordBody(input);
    const { authService, authCookieHelper } = getContainer();
    await authService.changePassword(user.id, dto);

    // service 层已提升 tokenVersion 使旧 Token 全部失效，这里同步清 Cookie 把客户端踢回登录流程。
    // cookies() 在 Server Action 中可写（含 set/delete），所以不需要为它再造一套 Cookie 逻辑：
    // 直接把自己交给 CookieWritable 接缝（与 NextResponse.cookies.set 同源签名）。
    const cookieStore = await cookies();
    authCookieHelper.clearAuthCookies({ cookies: cookieStore });

    return { ok: true, data: null };
  } catch (err) {
    return toFailure(err);
  }
}
