import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request, ParseBoolPipe } from '@nestjs/common';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { PrivateGuard } from '../private/private.guard';
import { ItemType } from '@prisma/client';

class CreateItemDto {
  type: 'NOTE' | 'URL';
  title?: string;
  content?: string;
  url?: string;
  folderId?: string | null;
}

class UpdateItemDto {
  title?: string;
  content?: string;
  url?: string;
  folderId?: string | null;
  isStarred?: boolean;
}

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * 获取普通items列表（硬拦截：不包含隐私内容）
   */
  @Get('list')
  async getPublicItems(
    @Request() req,
    @Query('type') type: string,
    @Query('folderId') folderId?: string,
    @Query('includeUnfiled') includeUnfiled?: string,
  ) {
    const items = await this.itemsService.getPublicItems(
      req.user.userId,
      type as ItemType,
      folderId,
      includeUnfiled === 'true',
    );
    return {
      success: true,
      data: items,
    };
  }

  /**
   * 创建 item
   */
  @Post()
  async createItem(@Request() req, @Body() dto: CreateItemDto) {
    const item = await this.itemsService.createItem(req.user.userId, {
      type: dto.type as ItemType,
      title: dto.title,
      content: dto.content,
      url: dto.url,
      folderId: dto.folderId,
    });
    return {
      success: true,
      data: item,
    };
  }

  /**
   * 获取普通item详情（硬拦截）
   */
  @Get(':id')
  async getPublicItem(@Request() req, @Param('id') id: string) {
    const item = await this.itemsService.getPublicItem(req.user.userId, id);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * 更新 item
   */
  @Patch(':id')
  async updateItem(@Request() req, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    const item = await this.itemsService.updateItem(req.user.userId, id, dto);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * 删除 item（软删）
   */
  @Delete(':id')
  async deleteItem(@Request() req, @Param('id') id: string) {
    await this.itemsService.deleteItem(req.user.userId, id);
    return {
      success: true,
      message: '项目删除成功',
    };
  }
}

class CreatePrivateItemDto {
  title?: string;
  content: string;
}

class UpdatePrivateItemDto {
  title?: string;
  content?: string;
  isStarred?: boolean;
}

@Controller('private/items')
@UseGuards(JwtAuthGuard, PrivateGuard)
export class PrivateItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * 获取隐私items列表（必须解锁）
   */
  @Get('list')
  async getPrivateItems(@Request() req, @Query('type') type: string) {
    const items = await this.itemsService.getPrivateItems(req.user.userId, type as ItemType);
    return {
      success: true,
      data: items,
    };
  }

  /**
   * 创建隐私 item（仅 NOTE）
   */
  @Post()
  async createPrivateItem(@Request() req, @Body() dto: CreatePrivateItemDto) {
    const item = await this.itemsService.createPrivateItem(req.user.userId, dto);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * 获取隐私item详情（必须解锁）
   */
  @Get(':id')
  async getPrivateItem(@Request() req, @Param('id') id: string) {
    const item = await this.itemsService.getPrivateItem(req.user.userId, id);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * 更新隐私 item
   */
  @Patch(':id')
  async updatePrivateItem(@Request() req, @Param('id') id: string, @Body() dto: UpdatePrivateItemDto) {
    const item = await this.itemsService.updatePrivateItem(req.user.userId, id, dto);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * 删除隐私 item（软删）
   */
  @Delete(':id')
  async deletePrivateItem(@Request() req, @Param('id') id: string) {
    await this.itemsService.deletePrivateItem(req.user.userId, id);
    return {
      success: true,
      message: '项目删除成功',
    };
  }
}

