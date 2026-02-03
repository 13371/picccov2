# Prisma 数据库设置步骤

## ✅ 修复完成项

1. ✅ **package.json 依赖检查** - 所有必需依赖已存在：
   - `dependencies`: `@prisma/client`, `bcryptjs`
   - `devDependencies`: `prisma`, `ts-node`, `typescript`, `@types/node`, `@types/bcryptjs`

2. ✅ **seed.ts import 修复** - 已修复为：
   ```typescript
   import { PrismaClient, UserRole, FolderKind } from "@prisma/client";
   import bcrypt from "bcryptjs";
   ```

3. ✅ **Folder 唯一约束** - 已添加：
   ```prisma
   @@unique([userId, kind, name])
   ```

## 🚀 执行命令顺序（必须按顺序执行）

### 前置条件
确保已配置 `backend/.env` 文件中的 `DATABASE_URL`：
```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名?schema=public"
```

### 步骤 1: 生成 Prisma Client
```bash
cd backend
pnpm prisma:generate
```
**说明**: 根据 schema.prisma 生成 TypeScript 类型和 Prisma Client

### 步骤 2: 创建并运行数据库迁移
```bash
cd backend
pnpm prisma migrate dev --name init
```
**说明**: 
- 创建初始迁移文件
- 应用迁移到数据库
- 如果配置了 seed，会自动运行 seed（可选）

### 步骤 3: 填充默认数据
```bash
cd backend
pnpm prisma:seed
```
**说明**: 运行 seed.ts，创建：
- ADMIN 用户（admin@example.com）
- NOTES 文件夹：隐私、分类1、分类2
- URLS 文件夹：常用、电商、工具

### 步骤 4: 打开 Prisma Studio（可选）
```bash
cd backend
pnpm prisma:studio
```
**说明**: 在浏览器中打开 http://localhost:5555 查看数据库内容

## 📝 完整命令序列（复制粘贴）

```bash
# 进入后端目录
cd backend

# 1. 生成 Prisma Client
pnpm prisma:generate

# 2. 创建并运行迁移
pnpm prisma migrate dev --name init

# 3. 填充默认数据
pnpm prisma:seed

# 4. 打开 Prisma Studio（可选）
pnpm prisma:studio
```

## ⚠️ 注意事项

1. **数据库连接**: 确保 PostgreSQL 服务正在运行，且 `DATABASE_URL` 配置正确
2. **依赖安装**: 如果遇到错误，先运行 `pnpm install` 安装所有依赖
3. **唯一约束**: Folder 的唯一约束确保同一用户在同一类型下不能有重名文件夹
4. **Seed 重复运行**: seed.ts 使用 `upsert`，可以安全地重复运行

## 🔍 验证迁移成功

迁移成功后，你应该看到：
- `backend/prisma/migrations/` 目录下有迁移文件
- 数据库中创建了所有表：users, folders, items, system_messages, user_messages
- Seed 数据已填充（可通过 Prisma Studio 查看）


