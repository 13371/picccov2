import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { PrivateGuard } from '../private/private.guard';
import { FolderKind } from '@prisma/client';

class CreateFolderDto {
  name: string;
  kind: 'NOTES' | 'URLS';
}

class UpdateFolderDto {
  name?: string;
  isStarred?: boolean;
}

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * 获取普通folders列表（硬拦截：不包含隐私folders）
   */
  @Get('list')
  async getPublicFolders(@Request() req, @Query('kind') kind: string) {
    const folders = await this.foldersService.getPublicFolders(req.user.userId, kind);
    return {
      success: true,
      data: folders,
    };
  }

  /**
   * 获取隐私文件夹元信息（只返回入口信息，不返回内容）
   * 即使未解锁也允许返回（因为这是"入口"，不包含 items，不泄露内容）
   */
  @Get('private-meta')
  async getPrivateFolderMeta(@Request() req) {
    const folder = await this.foldersService.getPrivateFolderMeta(req.user.userId);
    if (!folder) {
      return {
        success: true,
        data: null,
      };
    }
    return {
      success: true,
      data: folder,
    };
  }

  /**
   * 创建文件夹
   */
  @Post()
  async createFolder(@Request() req, @Body() dto: CreateFolderDto) {
    const folder = await this.foldersService.createFolder(
      req.user.userId,
      dto.name,
      dto.kind as FolderKind,
    );
    return {
      success: true,
      data: folder,
    };
  }

  /**
   * 获取普通folder详情（硬拦截）
   */
  @Get(':id')
  async getPublicFolder(@Request() req, @Param('id') id: string) {
    const folder = await this.foldersService.getPublicFolder(req.user.userId, id);
    return {
      success: true,
      data: folder,
    };
  }

  /**
   * 更新文件夹（重命名/星标）
   */
  @Patch(':id')
  async updateFolder(@Request() req, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
    const folder = await this.foldersService.updateFolder(req.user.userId, id, dto);
    return {
      success: true,
      data: folder,
    };
  }

  /**
   * 删除文件夹（仅当文件夹为空时允许）
   */
  @Delete(':id')
  async deleteFolder(@Request() req, @Param('id') id: string) {
    await this.foldersService.deleteFolder(req.user.userId, id);
    return {
      success: true,
      message: '文件夹删除成功',
    };
  }
}

@Controller('private/folders')
@UseGuards(JwtAuthGuard, PrivateGuard)
export class PrivateFoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * 获取隐私folders列表（必须解锁）
   */
  @Get('list')
  async getPrivateFolders(@Request() req, @Query('kind') kind?: string) {
    const folders = await this.foldersService.getPrivateFolders(req.user.userId, kind);
    return {
      success: true,
      data: folders,
    };
  }

  /**
   * 获取隐私folder详情（必须解锁）
   */
  @Get(':id')
  async getPrivateFolder(@Request() req, @Param('id') id: string) {
    const folder = await this.foldersService.getPrivateFolder(req.user.userId, id);
    return {
      success: true,
      data: folder,
    };
  }
}

