# 路由验证指南

## 问题排查

如果遇到 404 错误，请按以下步骤检查：

### 1. 确认服务已启动

```bash
cd backend
pnpm dev
```

**预期输出**:
```
🚀 后端服务运行在 http://localhost:3001

📋 已注册的路由:
  POST   /auth/request-code
  POST   /auth/verify-code
  ...
```

### 2. 检查路由列表

启动服务后，控制台会打印所有已注册的路由。请确认以下路由存在：

- ✅ `POST /auth/request-code`
- ✅ `POST /auth/verify-code`
- ✅ `GET /health`

### 3. 测试健康检查（最简单）

```bash
curl http://localhost:3001/health
```

**预期响应**:
```json
{
  "status": "ok",
  "message": "后端服务运行正常",
  "timestamp": "..."
}
```

如果这个也返回 404，说明服务没有正确启动或路由没有注册。

### 4. 测试认证路由

```bash
curl -X POST http://localhost:3001/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**预期响应**:
```json
{
  "success": true,
  "message": "验证码已发送（开发模式：请查看后端日志）"
}
```

### 5. 常见问题

#### 问题1: 服务启动但路由未显示

**可能原因**:
- 模块未正确导入
- 控制器未注册

**解决方法**:
1. 检查 `backend/src/app.module.ts` 中是否导入了 `AuthModule`
2. 检查 `backend/src/auth/auth.module.ts` 中是否注册了 `AuthController`

#### 问题2: 编译错误

**解决方法**:
```bash
cd backend
pnpm build
```

查看编译错误并修复。

#### 问题3: 端口被占用

**解决方法**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### 6. 验证模块注册

确认以下文件内容：

**backend/src/app.module.ts**:
```typescript
@Module({
  imports: [
    PrismaModule,
    AuthModule,  // ✅ 必须存在
    // ...
  ],
})
```

**backend/src/auth/auth.module.ts**:
```typescript
@Module({
  controllers: [AuthController],  // ✅ 必须存在
  // ...
})
```

**backend/src/auth/auth.controller.ts**:
```typescript
@Controller('auth')  // ✅ 路由前缀为 'auth'
export class AuthController {
  @Post('request-code')  // ✅ 完整路径: /auth/request-code
  // ...
}
```

### 7. 完整路由列表（预期）

启动服务后，应该看到以下路由（至少）：

```
📋 已注册的路由:
  GET     /
  GET     /health
  POST    /auth/request-code
  POST    /auth/verify-code
  POST    /private/set-password
  POST    /private/unlock
  GET     /items/list
  GET     /items/:id
  GET     /folders/list
  GET     /folders/:id
  GET     /private/items/list
  GET     /private/items/:id
  GET     /private/folders/list
  GET     /private/folders/:id
```

### 8. 如果仍然404

1. **重启服务**: 停止服务（Ctrl+C），然后重新启动
2. **清理构建**: 
   ```bash
   cd backend
   rm -rf dist
   pnpm build
   pnpm dev
   ```
3. **检查日志**: 查看控制台是否有错误信息
4. **验证URL**: 确保URL完全正确，没有多余的前缀或后缀

## 成功标志

当以下命令都返回非404响应时，说明路由配置正确：

```bash
# 1. 健康检查
curl http://localhost:3001/health

# 2. 请求验证码
curl -X POST http://localhost:3001/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 3. 验证登录（需要先获取验证码）
curl -X POST http://localhost:3001/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'
```


