import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrivateService } from './private.service';

@Injectable()
export class PrivateGuard implements CanActivate {
  constructor(private privateService: PrivateService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // 优先从 x-private-token header 获取（不区分大小写）
    let token = request.headers['x-private-token'] || request.headers['X-Private-Token'];
    
    // 如果未找到，尝试从 Authorization header 获取（用于兼容）
    if (!token && request.headers['authorization']) {
      const authHeader = request.headers['authorization'];
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!user || !token) {
      throw new ForbiddenException('需要隐私解锁token');
    }

    const isValid = await this.privateService.validateUnlockToken(user.userId, token);
    if (!isValid) {
      throw new ForbiddenException('隐私解锁token无效或已过期');
    }

    return true;
  }
}

