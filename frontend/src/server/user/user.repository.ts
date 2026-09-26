import "server-only";
import type { User, UserStats } from "@my-app/shared";
import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma/db";

type Tx = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type PrismaUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string;
  coverImage: string;
  bio: string;
  location: string;
  website: string;
  joined: Date;
  role: string;
  company: string;
  verified: boolean;
  disabled: boolean;
  tags: string[];
  socialTwitter: string;
  socialGithub: string;
  socialLinkedin: string;
  statsArticles: number;
  statsLikes: number;
  statsViews: number;
  password: string | null;
  tokenVersion: number;
  appearanceTheme: string | null;
  appearanceFontSize: string | null;
  createdAt: Date;
  updatedAt: Date;
  likedBy?: { postId: string }[];
  favoritedBy?: { postId: string }[];
};

export const userInclude = {
  likedBy: { select: { postId: true } },
  favoritedBy: { select: { postId: true } },
} as const;

export function mapToUser(p: PrismaUser): User {
  return {
    id: p.id,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    username: p.username,
    avatar: p.avatar,
    coverImage: p.coverImage,
    bio: p.bio,
    location: p.location,
    website: p.website,
    joined: p.joined.toISOString(),
    role: p.role,
    company: p.company,
    verified: p.verified,
    disabled: p.disabled,
    tags: p.tags,
    social: {
      twitter: p.socialTwitter,
      github: p.socialGithub,
      linkedin: p.socialLinkedin,
    },
    stats: {
      articles: p.statsArticles,
      likes: p.statsLikes,
      views: p.statsViews,
    },
    password: p.password ?? undefined,
    tokenVersion: p.tokenVersion,
    appearance:
      p.appearanceTheme && p.appearanceFontSize
        ? {
            theme: p.appearanceTheme as "light" | "dark" | "system",
            fontSize: p.appearanceFontSize as "small" | "medium" | "large",
          }
        : undefined,
    likedArticles: p.likedBy?.map((l) => l.postId) ?? [],
    favoritedArticles: p.favoritedBy?.map((f) => f.postId) ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function mapToPrismaData(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatar: user.avatar ?? "",
    coverImage: user.coverImage ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    website: user.website ?? "",
    joined: new Date(user.joined),
    role: user.role ?? "Writer",
    company: user.company ?? "",
    verified: user.verified ?? false,
    disabled: user.disabled ?? false,
    tags: user.tags ?? [],
    socialTwitter: user.social?.twitter ?? "",
    socialGithub: user.social?.github ?? "",
    socialLinkedin: user.social?.linkedin ?? "",
    statsArticles: user.stats?.articles ?? 0,
    statsLikes: user.stats?.likes ?? 0,
    statsViews: user.stats?.views ?? 0,
    password: user.password ?? null,
    tokenVersion: user.tokenVersion ?? 0,
    appearanceTheme: user.appearance?.theme ?? null,
    appearanceFontSize: user.appearance?.fontSize ?? null,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

/**
 * ponytail: 默认不 include likedBy/favoritedBy —— 这两张关联表的结果集随用户活跃度
 * 线性增长，而该函数是每个已登录请求的必经之路（getAuthPayload → resolveAuthData）。
 * 只有真正渲染点赞/收藏态的场景（getMe / login / updateUser / 收藏列表）才传
 * `{ withAssociations: true }`。
 */
export async function findUserById(
  id: string,
  opts?: { withAssociations?: boolean },
): Promise<User | undefined> {
  const row = await getPrisma().user.findUnique({
    where: { id },
    ...(opts?.withAssociations ? { include: userInclude } : {}),
  });
  return row ? mapToUser(row as unknown as PrismaUser) : undefined;
}

export async function findUserByEmail(
  email: string,
  opts?: { withAssociations?: boolean },
): Promise<User | undefined> {
  const row = await getPrisma().user.findUnique({
    where: { email },
    ...(opts?.withAssociations ? { include: userInclude } : {}),
  });
  return row ? mapToUser(row as unknown as PrismaUser) : undefined;
}

export async function existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
  const count = await getPrisma().user.count({
    where: { OR: [{ email }, { username }] },
  });
  return count > 0;
}

export function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export async function createUser(user: User): Promise<User> {
  const { likedArticles, favoritedArticles } = user;

  // ponytail: user 行与两张关联表必须同事务写入。此前是三段独立写，
  // 中间失败会留下一个「没有点赞/收藏记录的用户」，调用方无从得知。
  await getPrisma().$transaction(async (tx) => {
    await tx.user.create({ data: mapToPrismaData({ ...user }) });

    if (likedArticles && likedArticles.length > 0) {
      await tx.userPostLike.createMany({
        data: likedArticles.map((postId) => ({ userId: user.id, postId })),
        skipDuplicates: true,
      });
    }
    if (favoritedArticles && favoritedArticles.length > 0) {
      await tx.userPostFavorite.createMany({
        data: favoritedArticles.map((postId) => ({ userId: user.id, postId })),
        skipDuplicates: true,
      });
    }
  });

  return user;
}

export async function updateUser(id: string, partial: Partial<User>): Promise<User | undefined> {
  const data: Record<string, unknown> = {};

  if (partial.firstName !== undefined) data.firstName = partial.firstName;
  if (partial.lastName !== undefined) data.lastName = partial.lastName;
  if (partial.avatar !== undefined) data.avatar = partial.avatar;
  if (partial.coverImage !== undefined) data.coverImage = partial.coverImage;
  if (partial.bio !== undefined) data.bio = partial.bio;
  if (partial.location !== undefined) data.location = partial.location;
  if (partial.website !== undefined) data.website = partial.website;
  if (partial.username !== undefined) data.username = partial.username;
  if (partial.role !== undefined) data.role = partial.role;
  if (partial.company !== undefined) data.company = partial.company;
  if (partial.verified !== undefined) data.verified = partial.verified;
  if (partial.disabled !== undefined) data.disabled = partial.disabled;
  if (partial.tags !== undefined) data.tags = partial.tags;
  if (partial.password !== undefined) data.password = partial.password;
  if (partial.tokenVersion !== undefined) data.tokenVersion = partial.tokenVersion;
  if (partial.updatedAt !== undefined) data.updatedAt = new Date(partial.updatedAt);

  if (partial.social) {
    if (partial.social.twitter !== undefined) data.socialTwitter = partial.social.twitter;
    if (partial.social.github !== undefined) data.socialGithub = partial.social.github;
    if (partial.social.linkedin !== undefined) data.socialLinkedin = partial.social.linkedin;
  }

  if (partial.stats) {
    if (partial.stats.articles !== undefined) data.statsArticles = partial.stats.articles;
    if (partial.stats.likes !== undefined) data.statsLikes = partial.stats.likes;
    if (partial.stats.views !== undefined) data.statsViews = partial.stats.views;
  }

  if (partial.appearance) {
    data.appearanceTheme = partial.appearance.theme;
    data.appearanceFontSize = partial.appearance.fontSize;
  }

  // ponytail: 字段更新与关联表重建（deleteMany + createMany）必须同事务。
  // 此前三段独立写，重建中途失败会直接丢掉用户全部点赞/收藏数据。
  return getPrisma().$transaction(async (tx) => {
    let updatedRow: PrismaUser | null = null;

    try {
      if (Object.keys(data).length > 0) {
        updatedRow = (await tx.user.update({
          where: { id },
          data,
          include: userInclude,
        })) as unknown as PrismaUser;
      }
    } catch (err: unknown) {
      if (err instanceof Error && "code" in err && err.code === "P2025") return undefined;
      throw err;
    }

    if (partial.likedArticles !== undefined) {
      await tx.userPostLike.deleteMany({ where: { userId: id } });
      if (partial.likedArticles.length > 0) {
        await tx.userPostLike.createMany({
          data: partial.likedArticles.map((postId) => ({ userId: id, postId })),
          skipDuplicates: true,
        });
      }
    }

    if (partial.favoritedArticles !== undefined) {
      await tx.userPostFavorite.deleteMany({ where: { userId: id } });
      if (partial.favoritedArticles.length > 0) {
        await tx.userPostFavorite.createMany({
          data: partial.favoritedArticles.map((postId) => ({ userId: id, postId })),
          skipDuplicates: true,
        });
      }
    }

    // 如果有关联表更新或没有字段更新，需要 re-fetch 以获取最新关联数据
    if (
      !updatedRow ||
      partial.likedArticles !== undefined ||
      partial.favoritedArticles !== undefined
    ) {
      const row = await tx.user.findUnique({
        where: { id },
        include: userInclude,
      });
      return row ? mapToUser(row as unknown as PrismaUser) : undefined;
    }

    return updatedRow ? mapToUser(updatedRow) : undefined;
  });
}

/**
 * 原子递增 tokenVersion。读-改-写（`tokenVersion: user.tokenVersion + 1`）在并发下
 * 会丢更新 —— 两次递增读到同一个旧值、写回同一个新值，其中一次被吞掉，
 * 本该吊销的会话仍有有效版本号。
 */
export async function bumpTokenVersion(id: string): Promise<void> {
  // updateMany 对不存在的 id 静默返回 0 条，登出流程不会因为用户已消失而 500。
  await getPrisma().user.updateMany({
    where: { id },
    data: { tokenVersion: { increment: 1 } },
  });
}

/**
 * ponytail: 不再吞异常。此前 catch { return false } 让「DB 抖动」和「计数为 0」
 * 无法区分，调用方只能把它当 best-effort 静默跳过（计数永久漂移）。
 * 现在错误直接冒泡：在事务里会回滚，事务外由调用方决定如何处理。
 */
export async function incrementUserStats(
  id: string,
  field: keyof UserStats,
  delta: number,
  tx?: Tx,
): Promise<void> {
  const fieldMap: Record<keyof UserStats, string> = {
    articles: "statsArticles",
    likes: "statsLikes",
    views: "statsViews",
  };
  const client = tx ?? getPrisma();
  await client.user.update({
    where: { id },
    data: { [fieldMap[field]]: { increment: delta } },
  });
}

/**
 * 切换点赞/收藏关系。返回「切换前是否存在」，让调用方能在同一个事务里算出计数增量。
 * 传 tx 时不自开事务——由调用方把关系表与计数合并进同一个事务。
 */
export async function toggleUserAssociation(
  id: string,
  field: "likedArticles" | "favoritedArticles",
  postId: string,
  tx?: Tx,
): Promise<boolean> {
  const key = { userId_postId: { userId: id, postId } };
  const client = tx ?? getPrisma();

  if (field === "likedArticles") {
    const existing = await client.userPostLike.findUnique({ where: key });
    const wasPresent = !!existing;
    if (wasPresent) await client.userPostLike.delete({ where: key });
    else await client.userPostLike.create({ data: { userId: id, postId } });
    return wasPresent;
  }

  const existing = await client.userPostFavorite.findUnique({ where: key });
  const wasPresent = !!existing;
  if (wasPresent) await client.userPostFavorite.delete({ where: key });
  else await client.userPostFavorite.create({ data: { userId: id, postId } });
  return wasPresent;
}
