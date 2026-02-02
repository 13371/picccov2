/*
  Warnings:

  - A unique constraint covering the columns `[userId,kind,name]` on the table `folders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "folders_userId_kind_name_key" ON "folders"("userId", "kind", "name");
