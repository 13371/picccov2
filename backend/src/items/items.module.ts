import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController, PrivateItemsController } from './items.controller';
import { PrivateModule } from '../private/private.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [PrivateModule, FoldersModule],
  controllers: [ItemsController, PrivateItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}

