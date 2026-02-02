import { PrismaClient, UserRole, FolderKind } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充默认数据...');

  // 创建 ADMIN 用户
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      privatePasswordHash: null,
      lastActiveAt: new Date(),
    },
  });

  console.log('✅ 创建 ADMIN 用户:', adminUser.email);

  // 创建 NOTES 文件夹
  const notesFolders = [
    { name: '隐私', isPrivate: true, isStarred: false },
    { name: '分类1', isPrivate: false, isStarred: false },
    { name: '分类2', isPrivate: false, isStarred: false },
  ];

  for (const folderData of notesFolders) {
    await prisma.folder.upsert({
      where: {
        userId_kind_name: {
          userId: adminUser.id,
          kind: FolderKind.NOTES,
          name: folderData.name,
        },
      },
      update: {},
      create: {
        name: folderData.name,
        kind: FolderKind.NOTES,
        isPrivate: folderData.isPrivate,
        isStarred: folderData.isStarred,
        userId: adminUser.id,
      },
    });
  }

  console.log('✅ 创建 NOTES 文件夹:', notesFolders.map((f) => f.name).join(', '));

  // 创建 URLS 文件夹
  const urlsFolders = [
    { name: '常用', isStarred: true },
    { name: '电商', isStarred: false },
    { name: '工具', isStarred: false },
  ];

  for (const folderData of urlsFolders) {
    await prisma.folder.upsert({
      where: {
        userId_kind_name: {
          userId: adminUser.id,
          kind: FolderKind.URLS,
          name: folderData.name,
        },
      },
      update: {},
      create: {
        name: folderData.name,
        kind: FolderKind.URLS,
        isPrivate: false, // URLS 类型不能是隐私
        isStarred: folderData.isStarred,
        userId: adminUser.id,
      },
    });
  }

  console.log('✅ 创建 URLS 文件夹:', urlsFolders.map((f) => f.name).join(', '));

  console.log('🎉 默认数据填充完成！');
}

main()
  .catch((e) => {
    console.error('❌ Seed 执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
