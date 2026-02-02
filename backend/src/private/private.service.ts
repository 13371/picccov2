import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// 隐私解锁token存储（内存缓存，15分钟有效期）
interface PrivateUnlockToken {
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class PrivateService {
  // 内存存储解锁token（生产环境可用Redis）
  private unlockTokens = new Map<string, PrivateUnlockToken>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 设置隐私二级密码
   */
  async setPassword(userId: string, password: string, confirmPassword: string): Promise<void> {
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的密码不一致');
    }

    if (password.length < 4 || password.length > 10) {
      throw new BadRequestException('密码长度必须在4-10个字符之间');
    }

    // 检查是否已设置密码
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });

    if (user?.privatePasswordHash) {
      throw new BadRequestException('隐私密码已设置，无法重复设置');
    }

    // 使用bcrypt加密密码
    const hash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { privatePasswordHash: hash },
    });
  }

  /**
   * 验证隐私密码并返回解锁token
   */
  async unlock(userId: string, password: string): Promise<{ privateUnlockedToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });

    if (!user || !user.privatePasswordHash) {
      throw new BadRequestException('请先设置隐私密码');
    }

    const isValid = await bcrypt.compare(password, user.privatePasswordHash);
    if (!isValid) {
      throw new UnauthorizedException('隐私密码错误');
    }

    // 生成解锁token（15分钟有效期）
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const token = this.jwtService.sign(
      { sub: userId, type: 'private-unlock' },
      { expiresIn: '15m' },
    );

    // 存储到内存（用于验证）
    this.unlockTokens.set(userId, { userId, expiresAt });

    // 清理过期token
    this.cleanExpiredTokens();

    return { privateUnlockedToken: token };
  }

  /**
   * 验证隐私解锁token
   */
  async validateUnlockToken(userId: string, token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'private-unlock' || payload.sub !== userId) {
        return false;
      }

      const stored = this.unlockTokens.get(userId);
      if (!stored || new Date() > stored.expiresAt) {
        this.unlockTokens.delete(userId);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查用户是否已设置隐私密码
   */
  async hasPrivatePassword(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });
    return !!user?.privatePasswordHash;
  }

  /**
   * 清理过期token
   */
  private cleanExpiredTokens() {
    const now = new Date();
    for (const [userId, data] of this.unlockTokens.entries()) {
      if (now > data.expiresAt) {
        this.unlockTokens.delete(userId);
      }
    }
  }
}

