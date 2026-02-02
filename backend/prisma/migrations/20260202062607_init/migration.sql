-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "FolderKind" AS ENUM ('NOTES', 'URLS');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('NOTE', 'URL');

-- CreateEnum
CREATE TYPE "MessageTarget" AS ENUM ('ALL', 'PARTIAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "privatePasswordHash" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FolderKind" NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "title" VARCHAR(10),
    "content" TEXT,
    "url" TEXT,
    "folderId" TEXT,
    "userId" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "target" "MessageTarget" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_messages" (
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "user_messages_pkey" PRIMARY KEY ("userId","messageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "folders_userId_idx" ON "folders"("userId");

-- CreateIndex
CREATE INDEX "folders_userId_kind_idx" ON "folders"("userId", "kind");

-- CreateIndex
CREATE INDEX "folders_userId_isPrivate_idx" ON "folders"("userId", "isPrivate");

-- CreateIndex
CREATE INDEX "items_userId_idx" ON "items"("userId");

-- CreateIndex
CREATE INDEX "items_userId_deletedAt_idx" ON "items"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "items_userId_type_idx" ON "items"("userId", "type");

-- CreateIndex
CREATE INDEX "items_userId_folderId_idx" ON "items"("userId", "folderId");

-- CreateIndex
CREATE INDEX "items_userId_updatedAt_idx" ON "items"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "items_folderId_idx" ON "items"("folderId");

-- CreateIndex
CREATE INDEX "system_messages_createdAt_idx" ON "system_messages"("createdAt");

-- CreateIndex
CREATE INDEX "user_messages_userId_idx" ON "user_messages"("userId");

-- CreateIndex
CREATE INDEX "user_messages_messageId_idx" ON "user_messages"("messageId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "system_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
