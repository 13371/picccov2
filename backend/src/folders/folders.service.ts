import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FolderKind } from '@prisma/client';

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取普通folders列表（硬拦截：排除隐私folders）
   */
  async getPublicFolders(userId: string, kind: string) {
    if (!kind || (kind !== 'NOTES' && kind !== 'URLS')) {
      throw new BadRequestException('kind 参数必传，且必须是 NOTES 或 URLS');
    }

    return this.prisma.folder.findMany({
      where: {
        userId,
        isPrivate: false, // 硬拦截：只返回非隐私folders
        kind: kind as FolderKind,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * 获取隐私folders列表（必须通过PrivateGuard）
   */
  async getPrivateFolders(userId: string, kind?: string) {
    const where: any = {
      userId,
      isPrivate: true,
    };

    if (kind) {
      where.kind = kind;
    }

    return this.prisma.folder.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * 获取普通folder详情（硬拦截：只返回非隐私 folder，不限制 kind）
   */
  async getPublicFolder(userId: string, folderId: string) {
    return this.getPublicFolderById(userId, folderId);
  }

  /**
   * 根据 ID 获取普通 folder（硬拦截：只返回非隐私 folder，不限制 kind）
   * 全项目唯一的"普通 folder 查询"方法
   * 用于 ItemsService 等需要验证 folder 的场景
   */
  async getPublicFolderById(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        isPrivate: false,
      },
    });

    if (!folder) {
      throw new NotFoundException('文件夹不存在或无权访问');
    }

    return folder;
  }

  /**
   * 获取隐私folder详情（必须通过PrivateGuard）
   */
  async getPrivateFolder(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        isPrivate: true,
      },
    });

    if (!folder) {
      // 不透露资源是否存在
      throw new ForbiddenException();
    }

    return folder;
  }

  /**
   * 创建文件夹
   */
  async createFolder(userId: string, name: string, kind: FolderKind) {
    // 检查是否已存在同名文件夹（同用户、同类型、同名）
    const existing = await this.prisma.folder.findFirst({
      where: {
        userId,
        kind,
        name,
      },
    });

    if (existing) {
      throw new BadRequestException('文件夹名称已存在');
    }

    // NOTE folders 默认 isPrivate=false
    const isPrivate = kind === FolderKind.NOTES ? false : false; // 普通接口只能创建非隐私文件夹

    return this.prisma.folder.create({
      data: {
        name,
        kind,
        isPrivate,
        isStarred: false,
        userId,
      },
    });
  }

  /**
   * 更新文件夹（重命名/星标）
   */
  async updateFolder(userId: string, folderId: string, data: { name?: string; isStarred?: boolean }) {
    // 使用统一的 getPublicFolderById 方法
    const folder = await this.getPublicFolderById(userId, folderId);

    // 如果重命名，检查新名称是否已存在
    if (data.name && data.name !== folder.name) {
      const existing = await this.prisma.folder.findFirst({
        where: {
          userId,
          kind: folder.kind,
          name: data.name,
        },
      });

      if (existing) {
        throw new BadRequestException('文件夹名称已存在');
      }
    }

    return this.prisma.folder.update({
      where: { id: folderId },
      data,
    });
  }

  /**
   * 删除文件夹（仅当文件夹为空时允许）
   */
  async deleteFolder(userId: string, folderId: string) {
    // 使用统一的 getPublicFolderById 方法验证 folder 存在且非隐私
    await this.getPublicFolderById(userId, folderId);

    // 检查文件夹是否为空（需要单独查询 items）
    const itemsCount = await this.prisma.item.count({
      where: {
        folderId,
        deletedAt: null,
      },
    });

    if (itemsCount > 0) {
      throw new BadRequestException('文件夹非空，无法删除');
    }

    return this.prisma.folder.delete({
      where: { id: folderId },
    });
  }
}

