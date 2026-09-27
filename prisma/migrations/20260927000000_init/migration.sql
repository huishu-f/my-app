◇ injected env (2) from .env.local // tip: ⌘ suppress logs { quiet: true }
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "joined" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Writer',
    "company" TEXT NOT NULL DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialTwitter" TEXT NOT NULL DEFAULT '',
    "socialGithub" TEXT NOT NULL DEFAULT '',
    "socialLinkedin" TEXT NOT NULL DEFAULT '',
    "statsArticles" INTEGER NOT NULL DEFAULT 0,
    "statsLikes" INTEGER NOT NULL DEFAULT 0,
    "statsViews" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "appearanceTheme" TEXT,
    "appearanceFontSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isDraft" BOOLEAN NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "coverImage" TEXT,
    "authorId" TEXT,
    "authorName" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPostLike" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "UserPostLike_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "UserPostFavorite" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "UserPostFavorite_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "blogName" TEXT NOT NULL,
    "author" TEXT NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostIdMap" (
    "oldId" TEXT NOT NULL,
    "newId" TEXT NOT NULL,

    CONSTRAINT "PostIdMap_pkey" PRIMARY KEY ("oldId")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE INDEX "Post_isDraft_publishedAt_idx" ON "Post"("isDraft", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_tags_idx" ON "Post" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "PostIdMap_newId_idx" ON "PostIdMap"("newId");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostLike" ADD CONSTRAINT "UserPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostLike" ADD CONSTRAINT "UserPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostFavorite" ADD CONSTRAINT "UserPostFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostFavorite" ADD CONSTRAINT "UserPostFavorite_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

