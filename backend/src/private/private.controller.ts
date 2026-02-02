import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PrivateService } from './private.service';
import { JwtAuthGuard } from '../auth/auth.guard';

class SetPasswordDto {
  password: string;
  confirmPassword: string;
}

class UnlockDto {
  password: string;
}

@Controller('private')
@UseGuards(JwtAuthGuard)
export class PrivateController {
  constructor(private readonly privateService: PrivateService) {}

  @Post('set-password')
  async setPassword(@Request() req, @Body() dto: SetPasswordDto) {
    await this.privateService.setPassword(req.user.userId, dto.password, dto.confirmPassword);
    return {
      success: true,
      message: '隐私密码设置成功',
    };
  }

  @Post('unlock')
  async unlock(@Request() req, @Body() dto: UnlockDto) {
    const result = await this.privateService.unlock(req.user.userId, dto.password);
    return {
      success: true,
      ...result,
    };
  }
}

