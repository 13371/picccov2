import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { FolderKind } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// 验证码存储（开发模式：内存存储）
interface VerificationCode {
  code: string;
  email: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // 内存存储验证码（开发模式）
  private verificationCodes = new Map<string, VerificationCode>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 生成并存储验证码（开发模式：打印到日志）
   */
  async requestCode(email: string): Promise<void> {
    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    // 存储验证码
    this.verificationCodes.set(email, { code, email, expiresAt });

    // 开发模式：打印到日志
    this.logger.log(`📧 验证码已生成 [${email}]: ${code} (有效期10分钟)`);

    // 清理过期验证码
    this.cleanExpiredCodes();
  }

  /**
   * 验证验证码并返回JWT token
   */
  async verifyCode(email: string, code: string): Promise<{ accessToken: string }> {
    const stored = this.verificationCodes.get(email);

    if (!stored) {
      throw new UnauthorizedException('验证码不存在或已过期');
    }

    if (stored.code !== code) {
      throw new UnauthorizedException('验证码错误');
    }

    if (new Date() > stored.expiresAt) {
      this.verificationCodes.delete(email);
      throw new UnauthorizedException('验证码已过期');
    }

    // 验证成功，删除验证码
    this.verificationCodes.delete(email);

    // 查找或创建用户
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    const isNewUser = !user;
    if (!user) {
      user = await this.prisma.user.create({
        data: { email },
      });
    }

    // 检查用户是否有 folders，如果没有则初始化默认 folders
    const foldersCount = await this.prisma.folder.count({
      where: { userId: user.id },
    });

    if (foldersCount === 0) {
      await this.initializeDefaultFolders(user.id);
      this.logger.log(`✅ 新用户初始化成功 [${user.email}]: 已创建默认 folders`);
    }

    // 生成JWT token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // 更新用户最后活跃时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return { accessToken };
  }

  /**
   * 初始化用户的默认 folders（幂等）
   */
  private async initializeDefaultFolders(userId: string): Promise<void> {
    const defaultFolders = [
      // NOTES folders
      { name: '隐私', kind: FolderKind.NOTES, isPrivate: true, userId },
      { name: '分类1', kind: FolderKind.NOTES, isPrivate: false, userId },
      { name: '分类2', kind: FolderKind.NOTES, isPrivate: false, userId },
      // URLS folders
      { name: '常用', kind: FolderKind.URLS, isPrivate: false, userId },
      { name: '电商', kind: FolderKind.URLS, isPrivate: false, userId },
      { name: '工具', kind: FolderKind.URLS, isPrivate: false, userId },
    ];

    // 使用 createMany 的 skipDuplicates 选项确保幂等
    // 由于 schema 中有 @@unique([userId, kind, name]) 约束，重复创建会失败
    // 使用 try-catch 或使用 upsert，这里使用 createMany + skipDuplicates
    await this.prisma.folder.createMany({
      data: defaultFolders,
      skipDuplicates: true, // 如果已存在则跳过（基于唯一约束）
    });
  }

  /**
   * 根据用户ID查找用户
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * 清理过期验证码
   */
  private cleanExpiredCodes() {
    const now = new Date();
    for (const [email, data] of this.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        this.verificationCodes.delete(email);
      }
    }
  }
}

