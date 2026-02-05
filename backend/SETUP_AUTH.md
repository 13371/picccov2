# 鉴权系统本地运行指南

## 前置要求

1. Node.js >= 18.0.0
2. pnpm >= 8.0.0
3. PostgreSQL >= 12.0
4. 数据库已创建并运行迁移

## 环境变量配置

在 `backend/` 目录下创建或更新 `.env` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名?schema=public"

# JWT密钥（生产环境请使用强随机字符串）
JWT_SECRET="your-secret-key-change-in-production"

# 后端服务端口（可选，默认3001）
PORT=3001

# 前端URL（用于CORS，可选）
FRONTEND_URL=http://localhost:3000
```

## 安装依赖

```bash
cd backend
pnpm install
```

## 数据库迁移

确保数据库schema是最新的：

```bash
cd backend
pnpm prisma:generate
pnpm prisma:migrate
```

## 启动服务

```bash
cd backend
pnpm dev
```

服务将在 `http://localhost:3001` 启动。

## 完整测试流程

### 1. 请求验证码

```bash
curl -X POST http://localhost:3001/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**查看后端控制台日志**，找到类似以下输出：
```
📧 验证码已生成 [test@example.com]: 123456 (有效期10分钟)
```

### 2. 验证登录

使用上一步获取的验证码（例如：`123456`）：

```bash
curl -X POST http://localhost:3001/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

**保存返回的 `accessToken`**，后续请求需要用到。

### 3. 设置隐私密码

```bash
# 替换 YOUR_ACCESS_TOKEN 为步骤2获取的token
curl -X POST http://localhost:3001/private/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "password": "mypass",
    "confirmPassword": "mypass"
  }'
```

### 4. 解锁隐私

```bash
curl -X POST http://localhost:3001/private/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "password": "mypass"
  }'
```

**保存返回的 `privateUnlockedToken`**，用于访问隐私内容。

### 5. 测试普通内容（硬拦截验证）

```bash
# 获取普通items列表（不会包含隐私内容）
curl -X GET "http://localhost:3001/items/list" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 获取普通folders列表（不会包含隐私folders）
curl -X GET "http://localhost:3001/folders/list" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. 测试隐私内容（需要解锁）

```bash
# 获取隐私items列表（需要解锁token）
curl -X GET "http://localhost:3001/private/items/list" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Private-Token: YOUR_PRIVATE_UNLOCKED_TOKEN"

# 获取隐私folders列表
curl -X GET "http://localhost:3001/private/folders/list" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Private-Token: YOUR_PRIVATE_UNLOCKED_TOKEN"
```

## 验证硬拦截

### 测试场景1: 访问隐私item但未解锁

即使你知道某个item的ID，如果它在隐私folder下，通过普通接口访问会返回403：

```bash
curl -X GET "http://localhost:3001/items/某个隐私item的ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**预期**: `403 Forbidden` - "无权访问隐私内容"

### 测试场景2: 未解锁访问隐私接口

```bash
curl -X GET "http://localhost:3001/private/items/list" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**预期**: `403 Forbidden` - "需要隐私解锁token"

## 功能特性

### ✅ 已实现功能

1. **邮箱验证码登录**
   - 开发模式：验证码打印在日志
   - 验证码有效期10分钟
   - 自动创建用户（首次登录）

2. **JWT认证**
   - accessToken有效期7天
   - 所有接口（除health和auth）需要登录

3. **隐私二级密码**
   - 密码长度4-10字符
   - 使用bcrypt加密存储
   - 只能设置一次

4. **隐私解锁**
   - 解锁token有效期15分钟
   - 通过 `X-Private-Token` header传递

5. **后端硬拦截**
   - 普通接口绝不返回隐私内容
   - 隐私接口必须通过PrivateGuard
   - 未解锁访问返回403，不透露资源是否存在

6. **lastActiveAt节流更新**
   - 同一用户5分钟内最多更新一次
   - 异步更新，不阻塞请求

## 路由列表

### 无需认证
- `GET /health` - 健康检查
- `POST /auth/request-code` - 请求验证码
- `POST /auth/verify-code` - 验证登录

### 需要登录（JWT）
- `POST /private/set-password` - 设置隐私密码
- `POST /private/unlock` - 解锁隐私
- `GET /items/list` - 获取普通items列表
- `GET /items/:id` - 获取普通item详情
- `GET /folders/list` - 获取普通folders列表
- `GET /folders/:id` - 获取普通folder详情

### 需要登录+隐私解锁
- `GET /private/items/list` - 获取隐私items列表
- `GET /private/items/:id` - 获取隐私item详情
- `GET /private/folders/list` - 获取隐私folders列表
- `GET /private/folders/:id` - 获取隐私folder详情

## 注意事项

1. **开发模式验证码**: 当前验证码打印在日志中，生产环境需要集成邮件服务
2. **JWT密钥**: 生产环境必须使用强随机字符串作为JWT_SECRET
3. **内存存储**: 验证码和解锁token使用内存存储，生产环境建议使用Redis
4. **CORS配置**: 当前允许 `http://localhost:3000`，生产环境需要配置实际域名

## 故障排查

### 问题1: 验证码未显示在日志

检查后端服务是否正常运行，查看控制台输出。

### 问题2: 401 Unauthorized

- 检查accessToken是否正确
- 检查token是否过期（7天有效期）
- 检查请求头格式：`Authorization: Bearer <token>`

### 问题3: 403 Forbidden（隐私内容）

- 检查是否已设置隐私密码
- 检查是否已解锁（调用 `/private/unlock`）
- 检查 `X-Private-Token` header是否正确传递
- 检查解锁token是否过期（15分钟有效期）

### 问题4: 数据库连接错误

- 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
- 检查PostgreSQL服务是否运行
- 运行 `pnpm prisma:generate` 重新生成Prisma Client

## 下一步

1. 集成邮件服务发送验证码（生产环境）
2. 使用Redis存储验证码和解锁token（生产环境）
3. 添加刷新token机制
4. 添加登录日志和审计功能



