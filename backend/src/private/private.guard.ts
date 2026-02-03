import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrivateService } from './private.service';

@Injectable()
export class PrivateGuard implements CanActivate {
  constructor(private privateService: PrivateService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('需要登录');
    }

    // 检查解锁状态（从内存 Map 检查）
    const isUnlocked = this.privateService.isUnlocked(user.userId);
    if (!isUnlocked) {
      throw new ForbiddenException({ message: 'private locked', statusCode: 403 });
    }

    return true;
  }
}

