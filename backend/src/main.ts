import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用 CORS（开发环境）
  app.enableCors({
    origin: true,
    credentials: true,
  });
  

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  // 打印路由信息（使用Express的路由表）
  console.log('\n📋 已注册的路由:');
  const server = app.getHttpServer();
  const router = (server as any)._router;
  
  if (router && router.stack) {
    const routes: Array<{ method: string; path: string }> = [];
    
    function extractRoutes(layer: any, basePath = '') {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        const path = basePath + layer.route.path;
        methods.forEach((method: string) => {
          routes.push({ method: method.toUpperCase(), path });
        });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const newBasePath = basePath + (layer.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/^\^/, '')
          .replace(/\$$/, '')
          .replace(/\/\^/, '/')
          .replace(/\$/, '') || '');
        layer.handle.stack.forEach((handler: any) => {
          extractRoutes(handler, newBasePath);
        });
      }
    }
    
    router.stack.forEach((layer: any) => {
      extractRoutes(layer);
    });
    
    // 去重并排序
    const uniqueRoutes = Array.from(
      new Map(routes.map(r => [`${r.method}:${r.path}`, r])).values()
    ).sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });
    
    uniqueRoutes.forEach(({ method, path }) => {
      console.log(`  ${method.padEnd(6)} ${path}`);
    });
  } else {
    console.log('  (路由信息将在首次请求后可用)');
  }
  
  console.log(`\n🚀 后端服务运行在 http://localhost:${port}`);
  console.log(`\n✅ 关键路由（请确认以下路由存在）:`);
  console.log(`   POST http://localhost:${port}/auth/request-code`);
  console.log(`   POST http://localhost:${port}/auth/verify-code`);
  console.log(`   GET  http://localhost:${port}/health\n`);
}
bootstrap();

