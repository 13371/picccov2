import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrivateService {
  // 内存存储解锁状态：Map<userId, unlockedUntilTimestamp>
  // 解锁有效期：30 分钟
  private unlockMap = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  /**
   * 设置隐私密码（首次设置）
   */
  async setupPassword(userId: string, pin: string, confirm: string): Promise<void> {
    // 验证 pin 长度
    if (!pin || pin.length < 4 || pin.length > 10) {
      throw new BadRequestException('pin 长度必须在 4~10 字符之间');
    }

    // 验证两次输入一致
    if (pin !== confirm) {
      throw new BadRequestException('两次输入的密码不一致');
    }

    // 检查用户是否已有密码
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });

    if (user?.privatePasswordHash) {
      throw new ConflictException('密码已设置，不允许重复设置');
    }

    // 生成 hash（使用 bcrypt）
    const saltRounds = 10;
    const hash = await bcrypt.hash(pin, saltRounds);

    // 存储到数据库
    await this.prisma.user.update({
      where: { id: userId },
      data: { privatePasswordHash: hash },
    });

    // 设置成功后，直接解锁（30分钟）
    const unlockedUntil = Date.now() + 30 * 60 * 1000;
    this.unlockMap.set(userId, unlockedUntil);

    // 清理过期记录
    this.cleanExpiredUnlocks();
  }

  /**
   * 验证 pin 并解锁
   * 若用户还没有设置密码，返回 409
   */
  async unlock(userId: string, pin: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });

    // 检查是否已设置密码
    if (!user?.privatePasswordHash) {
      throw new ConflictException('pin not set');
    }

    // 使用 bcrypt 验证密码
    const isValid = await bcrypt.compare(pin, user.privatePasswordHash);

    if (!isValid) {
      throw new BadRequestException('pin incorrect');
    }

    // 解锁有效期：30 分钟
    const unlockedUntil = Date.now() + 30 * 60 * 1000;
    this.unlockMap.set(userId, unlockedUntil);

    // 清理过期记录
    this.cleanExpiredUnlocks();
  }

  /**
   * 修改隐私密码
   */
  async changePin(userId: string, oldPin: string, newPin: string, confirmNewPin: string): Promise<void> {
    // 读取用户的 privatePasswordHash
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });

    // 检查是否已设置密码
    if (!user?.privatePasswordHash) {
      throw new BadRequestException('pin not set');
    }

    // 校验旧密码
    const isOldPinValid = await bcrypt.compare(oldPin, user.privatePasswordHash);
    if (!isOldPinValid) {
      throw new BadRequestException('old pin incorrect');
    }

    // 校验新密码规则
    if (!newPin || newPin.length < 4 || newPin.length > 10) {
      throw new BadRequestException('新密码长度必须在 4~10 字符之间');
    }

    if (newPin !== confirmNewPin) {
      throw new BadRequestException('两次输入的新密码不一致');
    }

    // 生成新 hash（使用 bcrypt，与 setup/unlock 保持一致）
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPin, saltRounds);

    // 更新数据库
    await this.prisma.user.update({
      where: { id: userId },
      data: { privatePasswordHash: newHash },
    });

    // 清除解锁状态（强制锁回去）
    this.unlockMap.delete(userId);
  }

  /**
   * 锁定（删除解锁记录）
   */
  lock(userId: string): void {
    this.unlockMap.delete(userId);
  }

  /**
   * 检查用户是否已解锁
   */
  isUnlocked(userId: string): boolean {
    const unlockedUntil = this.unlockMap.get(userId);
    if (!unlockedUntil) {
      return false;
    }

    const now = Date.now();
    if (now >= unlockedUntil) {
      // 已过期，删除记录
      this.unlockMap.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * 获取解锁状态（用于前端校准）
   * 返回 { hasPassword: boolean, unlocked: boolean, expiresAt?: number }
   */
  async getUnlockStatus(userId: string): Promise<{ hasPassword: boolean; unlocked: boolean; expiresAt?: number }> {
    // 检查用户是否已设置密码
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privatePasswordHash: true },
    });

    const hasPassword = !!user?.privatePasswordHash;

    // 检查解锁状态
    const unlockedUntil = this.unlockMap.get(userId);
    if (!unlockedUntil) {
      return { hasPassword, unlocked: false };
    }

    const now = Date.now();
    if (now >= unlockedUntil) {
      // 已过期，删除记录
      this.unlockMap.delete(userId);
      return { hasPassword, unlocked: false };
    }

    return { hasPassword, unlocked: true, expiresAt: unlockedUntil };
  }

  /**
   * 清理过期解锁记录
   */
  private cleanExpiredUnlocks() {
    const now = Date.now();
    for (const [userId, unlockedUntil] of this.unlockMap.entries()) {
      if (now >= unlockedUntil) {
        this.unlockMap.delete(userId);
      }
    }
  }
}


