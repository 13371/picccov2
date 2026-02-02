# 数据库模型设计说明

## 📋 完整 Schema

所有模型定义在 `schema.prisma` 文件中，包含：

### 1. User（用户模型）
- `id`: UUID 主键
- `email`: 唯一邮箱
- `role`: 用户角色（USER / ADMIN）
- `privatePasswordHash`: 隐私二级密码哈希（可选）
- `lastActiveAt`: 最后活跃时间
- `createdAt` / `updatedAt`: 时间戳

### 2. Folder（文件夹模型）
- `id`: UUID 主键
- `name`: 文件夹名称
- `kind`: 文件夹类型（NOTES / URLS）
- `isPrivate`: 是否为隐私文件夹（仅 NOTES 可为 true）
- `isStarred`: 是否收藏
- `userId`: 所属用户 ID
- `createdAt` / `updatedAt`: 时间戳

### 3. Item（统一项目模型 - NOTE 和 URL 共用）
- `id`: UUID 主键
- `type`: 项目类型（NOTE / URL）
- `title`: 标题（最多 10 字，可为空）
- `content`: 内容（NOTE 类型使用）
- `url`: 网址（URL 类型使用）
- `folderId`: 所属文件夹 ID（可为空，表示"未分类"）
- `userId`: 所属用户 ID
- `isStarred`: 是否收藏
- `deletedAt`: 软删除时间戳（tombstone）
- `createdAt` / `updatedAt`: 时间戳（updatedAt 用于同步排序）

### 4. SystemMessage（系统消息模型）
- `id`: UUID 主键
- `content`: 消息内容
- `target`: 目标类型（ALL / PARTIAL）
- `createdAt`: 创建时间

### 5. UserMessage（用户消息关联表）
- `userId`: 用户 ID
- `messageId`: 消息 ID
- `readAt`: 阅读时间（可为空）

## 🔑 核心设计原则

### NOTE 和 URL 共用 Item 表的原因

**为什么不会出问题：**

1. **类型隔离通过 type 字段实现**
   - `type` 字段明确区分 NOTE 和 URL
   - 查询时可以通过 `WHERE type = 'NOTE'` 或 `WHERE type = 'URL'` 过滤
   - 应用层可以验证：NOTE 类型必须有 `content`，URL 类型必须有 `url`

2. **字段互斥但共存**
   - `content` 和 `url` 字段虽然互斥，但在数据库中同时存在不会造成问题
   - 应用层逻辑确保：`type = 'NOTE'` 时 `content` 有值，`url` 为空
   - `type = 'URL'` 时 `url` 有值，`content` 为空

3. **统一的操作逻辑**
   - 新增、编辑、删除、同步逻辑完全统一
   - 不需要维护两套代码
   - 查询、排序、分页逻辑一致

4. **数据库层面的优势**
   - 单一表结构，索引更高效
   - 关联查询更简单（如：用户的所有项目）
   - 软删除、同步时间戳统一管理

5. **扩展性更好**
   - 未来如果需要新的项目类型，只需添加新的 `type` 值
   - 不需要创建新表或修改大量代码

## 🔒 隐私规则支持

1. **Folder.isPrivate = true** 表示隐私文件夹
2. **Item 继承文件夹的隐私属性**：通过 `folderId` 关联查询
3. **查询时过滤**：
   - 隐私内容不能出现在非隐私列表
   - 隐私内容不能被搜索（除非通过隐私路径）
   - 隐私内容不能出现在首页

## 🗑️ 软删除机制

1. **所有删除使用 `deletedAt` 字段**（tombstone 模式）
2. **查询默认排除已删除项**：`WHERE deletedAt IS NULL`
3. **`updatedAt` 用于同步排序**：客户端按 `updatedAt DESC` 排序
4. **数据库为准**：客户端只是缓存，同步时以数据库的 `updatedAt` 为准

## 📊 索引优化

- `User.email`: 邮箱查询索引
- `Folder.userId, kind`: 按用户和类型查询
- `Folder.userId, isPrivate`: 隐私文件夹查询
- `Item.userId, deletedAt`: 排除已删除项查询
- `Item.userId, type`: 按类型查询
- `Item.userId, folderId`: 按文件夹查询
- `Item.userId, updatedAt`: 同步排序索引

## 🌱 默认数据（Seed）

运行 `pnpm prisma:seed` 会创建：

### NOTES 文件夹
- 隐私（isPrivate: true）
- 分类1
- 分类2

### URLS 文件夹
- 常用（isStarred: true）
- 电商
- 工具

### 用户
- ADMIN 用户（email: admin@example.com）

## 🚀 使用步骤

### 1. 生成 Prisma Client
```bash
cd backend
pnpm prisma:generate
```

### 2. 创建并运行迁移
```bash
cd backend
pnpm prisma:migrate
# 或指定迁移名称
pnpm prisma migrate dev --name init
```

### 3. 填充默认数据
```bash
cd backend
pnpm prisma:seed
```

### 4. 查看数据库（可选）
```bash
cd backend
pnpm prisma:studio
```

