import { Controller, Get, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { PrivateService } from './private.service';
import { JwtAuthGuard } from '../auth/auth.guard';

class UnlockDto {
  pin: string;
}

class SetupPasswordDto {
  pin: string;
  confirm: string;
}

class ChangePinDto {
  oldPin: string;
  newPin: string;
  confirmNewPin: string;
}

@Controller('private')
@UseGuards(JwtAuthGuard)
export class PrivateController {
  constructor(private readonly privateService: PrivateService) {}

  @Get('status')
  async getStatus(@Request() req) {
    const status = await this.privateService.getUnlockStatus(req.user.userId);
    return {
      success: true,
      data: status,
    };
  }

  @Post('setup')
  async setupPassword(@Request() req, @Body() dto: SetupPasswordDto) {
    await this.privateService.setupPassword(req.user.userId, dto.pin, dto.confirm);
    return {
      success: true,
    };
  }

  @Post('unlock')
  async unlock(@Request() req, @Body() dto: UnlockDto) {
    await this.privateService.unlock(req.user.userId, dto.pin);
    return {
      success: true,
    };
  }

  @Post('lock')
  async lock(@Request() req) {
    this.privateService.lock(req.user.userId);
    return {
      success: true,
    };
  }

  @Post('change-pin')
  async changePin(@Request() req, @Body() dto: ChangePinDto) {
    await this.privateService.changePin(req.user.userId, dto.oldPin, dto.newPin, dto.confirmNewPin);
    return {
      success: true,
    };
  }
}

@Controller('private/reset-pin')
@UseGuards(JwtAuthGuard)
export class PrivateResetPinController {
  /**
   * 请求邮箱验证码（占位，未实现）
   * TODO: 未来复用 /auth/request-code 与 /auth/verify-code
   */
  @Post('request-code')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async requestCode() {
    return {
      success: false,
      message: 'not implemented',
    };
  }

  /**
   * 验证邮箱验证码并重置密码（占位，未实现）
   * TODO: 未来复用 /auth/request-code 与 /auth/verify-code
   */
  @Post('verify-code')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async verifyCode() {
    return {
      success: false,
      message: 'not implemented',
    };
  }
}


