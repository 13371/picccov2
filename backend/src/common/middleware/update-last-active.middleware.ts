import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// 存储用户最后更新时间（用于节流）
const lastUpdateMap = new Map<string, number>();
const UPDATE_THROTTLE_MS = 5 * 60 * 1000; // 5分钟

@Injectable()
export class UpdateLastActiveMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 如果请求中有user（通过AuthGuard验证后注入），更新lastActiveAt
    // 使用类型断言，因为Express类型定义已扩展
    const user = (req as Request & { user?: { userId: string; email: string } }).user;
    if (user?.userId) {
      const userId = user.userId;
      const now = Date.now();
      const lastUpdate = lastUpdateMap.get(userId) || 0;

      // 节流：同一用户5分钟内最多更新一次
      if (now - lastUpdate >= UPDATE_THROTTLE_MS) {
        lastUpdateMap.set(userId, now);

        // 异步更新，不阻塞请求
        this.prisma.user
          .update({
            where: { id: userId },
            data: { lastActiveAt: new Date() },
          })
          .catch((err) => {
            // 静默失败，不影响请求
            console.error('更新lastActiveAt失败:', err);
          });
      }
    }

    next();
  }
}

