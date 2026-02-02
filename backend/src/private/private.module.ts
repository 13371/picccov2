import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrivateService } from './private.service';
import { PrivateController } from './private.controller';
import { PrivateGuard } from './private.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    }),
  ],
  controllers: [PrivateController],
  providers: [PrivateService, PrivateGuard],
  exports: [PrivateService, PrivateGuard],
})
export class PrivateModule {}

