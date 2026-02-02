import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PrivateModule } from './private/private.module';
import { ItemsModule } from './items/items.module';
import { FoldersModule } from './folders/folders.module';
import { SearchModule } from './search/search.module';
import { DebugModule } from './debug/debug.module';
import { UpdateLastActiveMiddleware } from './common/middleware/update-last-active.middleware';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PrivateModule,
    ItemsModule,
    FoldersModule,
    SearchModule,
    DebugModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 对所有路由应用lastActiveAt更新中间件（health和auth除外）
    consumer
      .apply(UpdateLastActiveMiddleware)
      .exclude('health', 'auth/(.*)')
      .forRoutes('*');
  }
}

