import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('debug')
@UseGuards(JwtAuthGuard)
export class DebugController {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取当前用户信息（仅开发环境）
   */
  @Get('me')
  async getMe(@Request() req) {
    const userId = req.user.userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    const foldersCount = await this.prisma.folder.count({
      where: { userId },
    });

    const folders = await this.prisma.folder.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        kind: true,
        isPrivate: true,
      },
      orderBy: [
        { kind: 'asc' },
        { isPrivate: 'desc' },
        { name: 'asc' },
      ],
    });

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        createdAt: user.createdAt,
        foldersCount,
        folders,
      },
    };
  }
}

