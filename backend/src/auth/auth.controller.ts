import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

class RequestCodeDto {
  email: string;
}

class VerifyCodeDto {
  email: string;
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-code')
  async requestCode(@Body() dto: RequestCodeDto) {
    await this.authService.requestCode(dto.email);
    return {
      success: true,
      message: '验证码已发送（开发模式：请查看后端日志）',
    };
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const result = await this.authService.verifyCode(dto.email, dto.code);
    return {
      success: true,
      ...result,
    };
  }
}


