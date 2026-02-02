# 快速开始 - 鉴权系统

## ⚠️ 重要说明

- **无全局前缀**: 所有路由直接挂载在根路径，例如 `/auth/request-code`（不是 `/api/auth/request-code`）
- **基础URL**: `http://localhost:3001`

## 一键启动

```bash
# 在项目根目录
pnpm dev
```

这将同时启动前端和后端。

## 完整测试流程（5分钟）

### 1️⃣ 启动服务

```bash
cd backend
pnpm dev
```

看到 `🚀 后端服务运行在 http://localhost:3001` 表示启动成功。

### 2️⃣ 请求验证码

打开新终端，执行：

```bash
curl -X POST http://localhost:3001/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**立即查看后端控制台**，找到验证码（例如：`123456`）

### 3️⃣ 登录获取Token

```bash
curl -X POST http://localhost:3001/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

**复制返回的 `accessToken`**，例如：
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4️⃣ 设置隐私密码

```bash
# 替换 YOUR_TOKEN 为上一步获取的 accessToken
curl -X POST http://localhost:3001/private/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "mypass",
    "confirmPassword": "mypass"
  }'
```

### 5️⃣ 解锁隐私

```bash
curl -X POST http://localhost:3001/private/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"password": "mypass"}'
```

**复制返回的 `privateUnlockedToken`**

### 6️⃣ 测试硬拦截

```bash
# 测试普通接口（不会返回隐私内容）
curl -X GET "http://localhost:3001/items/list" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 测试隐私接口（需要解锁token）
curl -X GET "http://localhost:3001/private/items/list" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Private-Token: YOUR_PRIVATE_TOKEN"
```

## 使用 HTTP 文件（推荐）

创建 `backend/test.http`:

```http
@baseUrl = http://localhost:3001
@email = test@example.com
@accessToken = 
@privateToken = 

### 1. 请求验证码（查看后端日志获取验证码）
POST {{baseUrl}}/auth/request-code
Content-Type: application/json

{"email": "{{email}}"}

### 2. 验证登录（替换 code 为日志中的验证码）
POST {{baseUrl}}/auth/verify-code
Content-Type: application/json

{
  "email": "{{email}}",
  "code": "123456"
}

### 3. 设置隐私密码（替换 accessToken）
POST {{baseUrl}}/private/set-password
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{
  "password": "mypass",
  "confirmPassword": "mypass"
}

### 4. 解锁隐私（替换 accessToken）
POST {{baseUrl}}/private/unlock
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{"password": "mypass"}

### 5. 获取普通items（替换 accessToken）
GET {{baseUrl}}/items/list
Authorization: Bearer {{accessToken}}

### 6. 获取隐私items（替换 accessToken 和 privateToken）
GET {{baseUrl}}/private/items/list
Authorization: Bearer {{accessToken}}
X-Private-Token: {{privateToken}}
```

使用 VS Code REST Client 插件运行这些请求。

## 核心功能验证清单

- [ ] ✅ 验证码登录成功
- [ ] ✅ 获取 accessToken
- [ ] ✅ 设置隐私密码成功
- [ ] ✅ 解锁隐私获取 privateUnlockedToken
- [ ] ✅ 普通接口不返回隐私内容（硬拦截）
- [ ] ✅ 隐私接口需要解锁token（PrivateGuard）
- [ ] ✅ 未解锁访问隐私返回403

## 常见问题

**Q: 验证码在哪里？**  
A: 查看后端控制台日志，格式：`📧 验证码已生成 [email]: 123456`

**Q: 401 Unauthorized？**  
A: 检查 accessToken 是否正确，是否过期（7天）

**Q: 403 Forbidden？**  
A: 隐私内容需要先解锁，检查是否调用了 `/private/unlock` 并传递了 `X-Private-Token`

**Q: 数据库连接错误？**  
A: 检查 `.env` 文件中的 `DATABASE_URL`，确保PostgreSQL运行中

## 下一步

详细文档请查看：
- `API_ROUTES.md` - 完整API文档
- `API_TEST_EXAMPLES.md` - 详细测试示例
- `SETUP_AUTH.md` - 完整设置指南

