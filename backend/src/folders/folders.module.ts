import { Module } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { FoldersController, PrivateFoldersController } from './folders.controller';
import { PrivateModule } from '../private/private.module';

@Module({
  imports: [PrivateModule],
  controllers: [FoldersController, PrivateFoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}

