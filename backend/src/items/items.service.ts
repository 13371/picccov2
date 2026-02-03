import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FoldersService } from '../folders/folders.service';
import { PrivateService } from '../private/private.service';
import { ItemType, FolderKind } from '@prisma/client';

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private foldersService: FoldersService,
    private privateService: PrivateService,
  ) {}

  /**
   * 获取普通items列表（硬拦截：排除所有隐私folder下的items）
   */
  async getPublicItems(
    userId: string,
    type: ItemType,
    folderId?: string,
    includeUnfiled: boolean = false,
    includeDraft: boolean = false,
  ) {
    if (!type || (type !== 'NOTE' && type !== 'URL')) {
      throw new BadRequestException('type 参数必传，且必须是 NOTE 或 URL');
    }

    const where: any = {
      userId,
      type: type as ItemType,
      deletedAt: null,
      // 默认排除草稿，除非明确指定 includeDraft=true
      isDraft: includeDraft ? undefined : false,
    };

    if (folderId) {
      // 根据 type 得到 expectedKind
      const expectedKind = type === 'NOTE' ? FolderKind.NOTES : FolderKind.URLS;

      // 使用 FoldersService 获取 folder（会检查 private 和解锁状态）
      let folder;
      try {
        folder = await this.foldersService.getPublicFolderById(userId, folderId);
      } catch (error) {
        // 如果 folder 不存在，返回 404
        if (error instanceof NotFoundException) {
          throw new NotFoundException('文件夹不存在');
        }
        // 如果是 403（private locked），直接抛出
        if (error instanceof ForbiddenException) {
          throw error;
        }
        throw error;
      }

      // 验证 kind 与 type 匹配（NOTE->NOTES, URL->URLS）
      if (folder.kind !== expectedKind) {
        throw new BadRequestException(
          `文件夹类型与项目类型不匹配：文件夹类型为 ${folder.kind}，项目类型为 ${type}，期望文件夹类型为 ${expectedKind}`,
        );
      }

      where.folderId = folderId;
    } else if (includeUnfiled) {
      // includeUnfiled=true 时返回 folderId=null 的未分类 items 或非隐私 folder 下的 items
      where.OR = [
        { folderId: null },
        {
          folder: {
            isPrivate: false,
          },
        },
      ];
    } else {
      // 只返回有分类的 items（非隐私 folder）
      where.folderId = { not: null };
      where.folder = {
        isPrivate: false,
      };
    }

    return this.prisma.item.findMany({
      where,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * 获取隐私items列表（必须通过PrivateGuard）
   */
  async getPrivateItems(userId: string, type: ItemType) {
    if (!type || type !== 'NOTE') {
      throw new BadRequestException('隐私接口仅支持 NOTE 类型');
    }

    const where: any = {
      userId,
      type: ItemType.NOTE,
      deletedAt: null,
      folder: {
        isPrivate: true,
      },
    };

    return this.prisma.item.findMany({
      where,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * 获取普通item详情（硬拦截）
   * 如果 item 属于 private folder 且未解锁，返回 403
   */
  async getPublicItem(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
        deletedAt: null,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
            isPrivate: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('项目不存在');
    }

    // 如果 item 属于 private folder，检查解锁状态
    if (item.folder?.isPrivate) {
      const isUnlocked = this.privateService.isUnlocked(userId);
      if (!isUnlocked) {
        throw new ForbiddenException({ message: 'private locked', statusCode: 403 });
      }
      // 已解锁，返回 item
      return item;
    }

    // 非 private item，正常返回
    return item;
  }

  /**
   * 获取隐私item详情（必须通过PrivateGuard）
   */
  async getPrivateItem(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
        deletedAt: null,
        folder: {
          isPrivate: true,
        },
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    });

    if (!item) {
      // 不透露资源是否存在
      throw new ForbiddenException();
    }

    return item;
  }

  /**
   * 创建普通 item
   */
  async createItem(
    userId: string,
    data: {
      type: ItemType;
      title?: string;
      content?: string;
      url?: string;
      folderId?: string | null;
      isDraft?: boolean;
    },
  ) {
    // 验证必填字段
    if (data.type === ItemType.NOTE && !data.content) {
      throw new BadRequestException('NOTE 类型必须提供 content');
    }
    if (data.type === ItemType.URL && !data.url) {
      throw new BadRequestException('URL 类型必须提供 url');
    }

    // 验证 title 长度（最多 10 字）
    if (data.title && data.title.length > 10) {
      throw new BadRequestException('title 最多 10 个字符');
    }

    // 如果提供了 folderId，验证 folder 存在且 kind 匹配
    // 如果是 private folder，检查解锁状态
    if (data.folderId) {
      // 根据 item.type 得到 expectedKind
      const expectedKind = data.type === ItemType.NOTE ? FolderKind.NOTES : FolderKind.URLS;

      // 使用 FoldersService 获取 folder（会检查 private 和解锁状态）
      let folder;
      try {
        folder = await this.foldersService.getPublicFolderById(userId, data.folderId);
      } catch (error) {
        // 如果 folder 不存在，返回 404
        if (error instanceof NotFoundException) {
          throw new NotFoundException('文件夹不存在或无权访问');
        }
        // 如果是 403（private locked），直接抛出
        if (error instanceof ForbiddenException) {
          throw error;
        }
        throw error;
      }

      // 校验 folder.kind 与 item.type 匹配
      if (folder.kind !== expectedKind) {
        throw new BadRequestException(
          `文件夹类型与项目类型不匹配：文件夹类型为 ${folder.kind}，项目类型为 ${data.type}，期望文件夹类型为 ${expectedKind}`,
        );
      }
    }

    return this.prisma.item.create({
      data: {
        type: data.type,
        title: data.title || null,
        content: data.type === ItemType.NOTE ? data.content : null,
        url: data.type === ItemType.URL ? data.url : null,
        folderId: data.folderId || null,
        userId,
        isStarred: false,
        isDraft: data.isDraft || false,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    });
  }

  /**
   * 更新普通 item
   * 如果 item 属于 private folder 且未解锁，返回 403
   */
  async updateItem(
    userId: string,
    itemId: string,
    data: {
      title?: string;
      content?: string;
      url?: string;
      folderId?: string | null;
      isStarred?: boolean;
    },
  ) {
    // 先获取 item
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
        deletedAt: null,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
            isPrivate: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('项目不存在');
    }

    // 如果 item 属于 private folder，检查解锁状态
    if (item.folder?.isPrivate) {
      const isUnlocked = this.privateService.isUnlocked(userId);
      if (!isUnlocked) {
        throw new ForbiddenException({ message: 'private locked', statusCode: 403 });
      }
    }

    // 验证 title 长度
    if (data.title !== undefined) {
      if (data.title && data.title.length > 10) {
        throw new BadRequestException('title 最多 10 个字符');
      }
    }

    // 如果更新 folderId，验证 folder 存在且 kind 匹配
    // 如果是 private folder，检查解锁状态
    if (data.folderId !== undefined) {
      if (data.folderId) {
        // 根据 item.type 得到 expectedKind
        const expectedKind = item.type === ItemType.NOTE ? FolderKind.NOTES : FolderKind.URLS;

        // 使用 FoldersService 获取 folder（会检查 private 和解锁状态）
        let folder;
        try {
          folder = await this.foldersService.getPublicFolderById(userId, data.folderId);
        } catch (error) {
          // 如果 folder 不存在，返回 404
          if (error instanceof NotFoundException) {
            throw new NotFoundException('文件夹不存在或无权访问');
          }
          // 如果是 403（private locked），直接抛出
          if (error instanceof ForbiddenException) {
            throw error;
          }
          throw error;
        }

        // 校验 folder.kind 与 item.type 匹配
        if (folder.kind !== expectedKind) {
          throw new BadRequestException(
            `文件夹类型与项目类型不匹配：文件夹类型为 ${folder.kind}，项目类型为 ${item.type}，期望文件夹类型为 ${expectedKind}`,
          );
        }
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title || null;
    if (data.content !== undefined && item.type === ItemType.NOTE) {
      updateData.content = data.content;
    }
    if (data.url !== undefined && item.type === ItemType.URL) {
      updateData.url = data.url;
    }
    if (data.folderId !== undefined) updateData.folderId = data.folderId || null;
    if (data.isStarred !== undefined) updateData.isStarred = data.isStarred;

    return this.prisma.item.update({
      where: { id: itemId },
      data: updateData,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    });
  }

  /**
   * 删除普通 item（软删）
   * 如果 item 属于 private folder 且未解锁，返回 403
   */
  async deleteItem(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
        deletedAt: null,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
            isPrivate: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('项目不存在');
    }

    // 如果 item 属于 private folder，检查解锁状态
    if (item.folder?.isPrivate) {
      const isUnlocked = this.privateService.isUnlocked(userId);
      if (!isUnlocked) {
        throw new ForbiddenException({ message: 'private locked', statusCode: 403 });
      }
    }

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * 创建隐私 item（仅 NOTE）
   */
  async createPrivateItem(userId: string, data: { title?: string; content: string }) {
    if (!data.content) {
      throw new BadRequestException('NOTE 类型必须提供 content');
    }

    // 验证 title 长度
    if (data.title && data.title.length > 10) {
      throw new BadRequestException('title 最多 10 个字符');
    }

    // 查找用户的隐私 NOTES folder（取第一个）
    const privateFolder = await this.prisma.folder.findFirst({
      where: {
        userId,
        kind: FolderKind.NOTES,
        isPrivate: true,
      },
    });

    if (!privateFolder) {
      throw new BadRequestException('未找到隐私文件夹，请先创建隐私文件夹');
    }

    return this.prisma.item.create({
      data: {
        type: ItemType.NOTE,
        title: data.title || null,
        content: data.content,
        folderId: privateFolder.id,
        userId,
        isStarred: false,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    });
  }

  /**
   * 更新隐私 item
   */
  async updatePrivateItem(
    userId: string,
    itemId: string,
    data: { title?: string; content?: string; isStarred?: boolean },
  ) {
    // 先验证 item 是隐私的
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
        deletedAt: null,
        folder: {
          isPrivate: true,
        },
      },
    });

    if (!item) {
      // 不透露资源是否存在
      throw new ForbiddenException();
    }

    // 验证 title 长度
    if (data.title !== undefined) {
      if (data.title && data.title.length > 10) {
        throw new BadRequestException('title 最多 10 个字符');
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title || null;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isStarred !== undefined) updateData.isStarred = data.isStarred;

    return this.prisma.item.update({
      where: { id: itemId },
      data: updateData,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    });
  }

  /**
   * 删除隐私 item（软删）
   */
  async deletePrivateItem(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
        deletedAt: null,
        folder: {
          isPrivate: true,
        },
      },
    });

    if (!item) {
      // 不透露资源是否存在
      throw new ForbiddenException();
    }

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * 搜索普通 items（硬拦截：永远不返回隐私 items）
   */
  async searchItems(userId: string, query: string, type: ItemType) {
    if (!query || !query.trim()) {
      throw new BadRequestException('搜索关键词不能为空');
    }

    if (!type || (type !== 'NOTE' && type !== 'URL')) {
      throw new BadRequestException('type 参数必传，且必须是 NOTE 或 URL');
    }

    const searchTerm = query.trim();

    // 硬拦截：永远不返回隐私 folder 下的 items
    // 需要处理 folderId 为 null 的情况
    // 默认排除草稿（isDraft=false）
    const where: any = {
      userId,
      type: type as ItemType,
      deletedAt: null,
      isDraft: false, // 搜索不包含草稿
      OR: [
        { folderId: null }, // 未分类的 items
        {
          folder: {
            isPrivate: false, // 非隐私 folder 下的 items
          },
        },
      ],
    };

    // 根据类型构建搜索条件
    if (type === ItemType.NOTE) {
      // NOTE 搜索 title 和 content
      where.AND = [
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ];
    } else {
      // URL 搜索 url
      where.url = { contains: searchTerm, mode: 'insensitive' };
    }

    return this.prisma.item.findMany({
      where,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}

