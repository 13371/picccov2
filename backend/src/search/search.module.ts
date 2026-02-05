import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [ItemsModule],
  controllers: [SearchController],
})
export class SearchModule {}



