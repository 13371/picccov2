import { Module } from '@nestjs/common';
import { PrivateService } from './private.service';
import { PrivateController, PrivateResetPinController } from './private.controller';
import { PrivateGuard } from './private.guard';

@Module({
  controllers: [PrivateController, PrivateResetPinController],
  providers: [PrivateService, PrivateGuard],
  exports: [PrivateService, PrivateGuard],
})
export class PrivateModule {}

