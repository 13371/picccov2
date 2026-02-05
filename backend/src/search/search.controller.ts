import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ItemsService } from '../items/items.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ItemType } from '@prisma/client';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * 搜索 items（硬拦截：永远不返回隐私 items）
   */
  @Get()
  async search(@Request() req, @Query('q') q: string, @Query('type') type: string) {
    const items = await this.itemsService.searchItems(req.user.userId, q, type as ItemType);
    return {
      success: true,
      data: items,
    };
  }
}



