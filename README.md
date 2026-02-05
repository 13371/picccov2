# Piccco Monorepo

这是一个使用 pnpm workspace 管理的 monorepo 项目，包含：

- **前端**: Next.js 14 (App Router + TypeScript)
- **后端**: NestJS (TypeScript) + Prisma + PostgreSQL

## 📁 项目结构

```
picccoV2/
├── frontend/          # Next.js 前端应用
├── backend/           # NestJS 后端应用
├── package.json       # 根目录 package.json（用于一键启动）
├── pnpm-workspace.yaml # pnpm workspace 配置
└── README.md          # 本文件
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 12.0

### 安装依赖

```bash
# 安装 pnpm（如果还没有安装）
npm install -g pnpm

# 在根目录安装所有依赖
pnpm install
```

### 环境变量配置

1. **后端环境变量**：在 `backend/` 目录下创建 `.env` 文件

```bash
cd backend
cp .env.example .env
```

然后编辑 `.env` 文件，配置数据库连接：

```env
# PostgreSQL 数据库连接
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名?schema=public"

# 后端服务端口（可选，默认 3001）
PORT=3001

# 前端 URL（用于 CORS，可选）
FRONTEND_URL=http://localhost:3000
```

2. **前端环境变量**（如果需要）：在 `frontend/` 目录下创建 `.env.local` 文件

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 数据库设置

1. **创建 PostgreSQL 数据库**：

```bash
# 使用 psql 命令行工具
psql -U postgres

# 在 psql 中执行
CREATE DATABASE piccco_db;
\q
```

2. **运行 Prisma 迁移**：

```bash
cd backend

# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate
```

或者使用 Prisma 的交互式迁移：

```bash
cd backend
pnpm prisma migrate dev --name init
```

### 启动项目

#### 方式一：一键启动（推荐）

在根目录运行：

```bash
pnpm dev
```

这将同时启动前端（http://localhost:3000）和后端（http://localhost:3001）。

#### 方式二：分别启动

**启动前端**：
```bash
cd frontend
pnpm dev
```

**启动后端**：
```bash
cd backend
pnpm dev
```

## 📝 Prisma 使用

### 生成 Prisma Client

```bash
cd backend
pnpm prisma:generate
```

### 创建迁移

```bash
cd backend
pnpm prisma:migrate
# 或者
pnpm prisma migrate dev --name 迁移名称
```

### 应用迁移（生产环境）

```bash
cd backend
pnpm prisma migrate deploy
```

### 打开 Prisma Studio（数据库可视化工具）

```bash
cd backend
pnpm prisma:studio
```

访问 http://localhost:5555 查看数据库内容。

### 重置数据库

```bash
cd backend
pnpm prisma migrate reset
```

## 🛠️ 开发命令

### 根目录命令

- `pnpm dev` - 同时启动前后端开发服务器
- `pnpm build` - 构建所有项目
- `pnpm install:all` - 安装所有依赖

### 前端命令（在 frontend/ 目录）

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务器
- `pnpm lint` - 运行 ESLint

### 后端命令（在 backend/ 目录）

- `pnpm dev` - 启动开发服务器（热重载）
- `pnpm build` - 构建项目
- `pnpm start` - 启动生产服务器
- `pnpm prisma:generate` - 生成 Prisma Client
- `pnpm prisma:migrate` - 运行数据库迁移
- `pnpm prisma:studio` - 打开 Prisma Studio

## 📚 技术栈

### 前端
- Next.js 14 (App Router)
- TypeScript
- React 18

### 后端
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [NestJS 文档](https://docs.nestjs.com)
- [Prisma 文档](https://www.prisma.io/docs)
- [pnpm 文档](https://pnpm.io)



