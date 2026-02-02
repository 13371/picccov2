# API 路由文档

## 基础信息

- 基础URL: `http://localhost:3001`
- **全局前缀**: 无（所有路由直接挂载在根路径）
- 认证方式: Bearer Token (JWT)
- 隐私解锁: `X-Private-Token` header 或 Bearer Token

**重要**: 本项目**没有设置全局前缀**（如 `/api`），所有路由直接挂载在根路径下。

**新用户默认 Folders**: 新用户首次登录时，系统会自动创建默认 folders：
- NOTES: 隐私(isPrivate=true), 分类1, 分类2
- URLS: 常用, 电商, 工具
- 使用 `createMany` + `skipDuplicates` 确保幂等（重复登录不会重复创建）
- 查看后端日志可以看到 "✅ 新用户初始化成功" 的提示

---

## 一、认证相关（无需登录）

### 1. 请求验证码
- **路由**: `POST /auth/request-code`
- **认证**: 无需
- **请求体**:
```json
{
  "email": "user@example.com"
}
```
- **响应**:
```json
{
  "success": true,
  "message": "验证码已发送（开发模式：请查看后端日志）"
}
```
- **说明**: 开发模式下，验证码会打印在后端日志中，有效期10分钟

### 2. 验证登录
- **路由**: `POST /auth/verify-code`
- **认证**: 无需
- **请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```
- **响应**:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 二、隐私密码相关（需要登录）

### 1. 设置隐私密码
- **路由**: `POST /private/set-password`
- **认证**: Bearer Token (JWT)
- **请求体**:
```json
{
  "password": "mypass",
  "confirmPassword": "mypass"
}
```
- **响应**:
```json
{
  "success": true,
  "message": "隐私密码设置成功"
}
```
- **说明**: 密码长度4-10个字符，只能设置一次

### 2. 解锁隐私
- **路由**: `POST /private/unlock`
- **认证**: Bearer Token (JWT)
- **请求体**:
```json
{
  "password": "mypass"
}
```
- **响应**:
```json
{
  "success": true,
  "privateUnlockedToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **说明**: 解锁token有效期15分钟

---

## 三、普通内容接口（需要登录，硬拦截隐私）

### 1. Folder CRUD

#### 1.1 获取普通folders列表
- **路由**: `GET /folders/list?kind=NOTES|URLS`
- **认证**: Bearer Token (JWT)
- **查询参数**:
  - `kind` (必传): NOTES 或 URLS
- **响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "...",
      "kind": "NOTES",
      "isPrivate": false,
      "isStarred": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```
- **说明**: 硬拦截，只返回非隐私folders；kind 参数必传

#### 1.2 创建文件夹
- **路由**: `POST /folders`
- **认证**: Bearer Token (JWT)
- **请求体**:
```json
{
  "name": "我的笔记",
  "kind": "NOTES"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "我的笔记",
    "kind": "NOTES",
    "isPrivate": false,
    "isStarred": false
  }
}
```
- **说明**: 
  - 默认 isStarred=false
  - NOTE folders 默认 isPrivate=false
  - 普通接口只能创建非隐私文件夹

#### 1.3 获取普通folder详情
- **路由**: `GET /folders/:id`
- **认证**: Bearer Token (JWT)
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "kind": "NOTES",
    "isPrivate": false
  }
}
```
- **说明**: 如果folder是隐私的，返回403

#### 1.4 更新文件夹（重命名/星标）
- **路由**: `PATCH /folders/:id`
- **认证**: Bearer Token (JWT)
- **请求体**:
```json
{
  "name": "新名称",
  "isStarred": true
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "新名称",
    "isStarred": true
  }
}
```
- **说明**: 可以更新 name 和 isStarred；不允许修改隐私文件夹

#### 1.5 删除文件夹
- **路由**: `DELETE /folders/:id`
- **认证**: Bearer Token (JWT)
- **响应**:
```json
{
  "success": true,
  "message": "文件夹删除成功"
}
```
- **说明**: 
  - 若 folder 内有未删除 items，返回 400（禁止删除非空 folder）
  - 空 folder 才允许删除
  - 不允许删除隐私文件夹

### 2. Item CRUD

#### 2.1 获取普通items列表
- **路由**: `GET /items/list?type=NOTE|URL&folderId=&includeUnfiled=true`
- **认证**: Bearer Token (JWT)
- **查询参数**: 
  - `type` (必传): NOTE 或 URL
  - `folderId` (可选): 文件夹ID，传则只查该 folder（且该 folder 必须非隐私）
  - `includeUnfiled` (可选): true 时返回 folderId=null 的未分类 items
- **响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "NOTE",
      "title": "...",
      "content": "...",
      "folderId": "...",
      "isStarred": false,
      "folder": {
        "id": "...",
        "name": "...",
        "kind": "NOTES"
      }
    }
  ]
}
```
- **说明**: 
  - 硬拦截，不会返回任何隐私folder下的items
  - 返回排序：updatedAt desc
  - 默认排除 deletedAt!=null

#### 2.2 创建 item
- **路由**: `POST /items`
- **认证**: Bearer Token (JWT)
- **请求体**:
```json
{
  "type": "NOTE",
  "title": "标题",
  "content": "内容",
  "folderId": "folder-id"
}
```
或
```json
{
  "type": "URL",
  "title": "标题",
  "url": "https://example.com",
  "folderId": "folder-id"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "type": "NOTE",
    "title": "标题",
    "content": "内容",
    "folderId": "...",
    "folder": {...}
  }
}
```
- **说明**: 
  - type=NOTE 必须有 content；type=URL 必须有 url
  - title 最多 10 字（超过返回 400）
  - folderId=null 表示未分类
  - folderId 非空则必须属于当前用户，且该 folder 必须非隐私，且 kind 与 type 匹配（NOTE->NOTES, URL->URLS）

#### 2.3 获取普通item详情
- **路由**: `GET /items/:id`
- **认证**: Bearer Token (JWT)
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "type": "NOTE",
    "title": "...",
    "content": "...",
    "folder": {...}
  }
}
```
- **说明**: 若 id 属于隐私 item 或已删除，返回 404

#### 2.4 更新 item
- **路由**: `PATCH /items/:id`
- **认证**: Bearer Token (JWT)
- **请求体**:
```json
{
  "title": "新标题",
  "content": "新内容",
  "url": "https://new-url.com",
  "folderId": "new-folder-id",
  "isStarred": true
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "新标题",
    "content": "新内容",
    "isStarred": true
  }
}
```
- **说明**: 
  - 可以更新 title/content/url/folderId/isStarred
  - 同上校验（title 长度、folder 非隐私、kind 匹配等）
  - 若 id 属于隐私 item，返回 404

#### 2.5 删除 item（软删）
- **路由**: `DELETE /items/:id`
- **认证**: Bearer Token (JWT)
- **响应**:
```json
{
  "success": true,
  "message": "项目删除成功"
}
```
- **说明**: 
  - 软删，设置 deletedAt=now
  - 若是隐私 item 返回 404

### 3. 搜索接口

#### 3.1 搜索 items
- **路由**: `GET /search?q=xxx&type=NOTE|URL`
- **认证**: Bearer Token (JWT)
- **查询参数**:
  - `q` (必传): 搜索关键词
  - `type` (必传): NOTE 或 URL
- **响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "NOTE",
      "title": "...",
      "content": "...",
      "folder": {...}
    }
  ]
}
```
- **说明**: 
  - 仅搜索非隐私 items（无论如何都搜不到隐私）
  - title/content/url 里模糊匹配（URL 搜索 url，NOTE 搜索 title+content）
  - 排序 updatedAt desc

---

## 四、隐私内容接口（需要登录+隐私解锁）

### 1. 隐私 Item CRUD

#### 1.1 获取隐私items列表
- **路由**: `GET /private/items/list?type=NOTE`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **查询参数**:
  - `type` (必传): 仅支持 NOTE
- **请求头**:
```
Authorization: Bearer <accessToken>
X-Private-Token: <privateUnlockedToken>
```
- **响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "NOTE",
      "title": "...",
      "content": "...",
      "folder": {...}
    }
  ]
}
```
- **说明**: 
  - 必须提供有效的隐私解锁token
  - 仅返回 NOTE 类型
  - 返回 updatedAt desc，排除 deletedAt

#### 1.2 创建隐私 item
- **路由**: `POST /private/items`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **请求体**:
```json
{
  "title": "隐私标题",
  "content": "隐私内容"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "type": "NOTE",
    "title": "隐私标题",
    "content": "隐私内容",
    "folder": {...}
  }
}
```
- **说明**: 
  - 创建 NOTE，必须落在 isPrivate=true 的 NOTES folder
  - 用户可能只有一个"隐私"folder，取第一个
  - 如果未找到隐私文件夹，返回 400

#### 1.3 获取隐私item详情
- **路由**: `GET /private/items/:id`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "type": "NOTE",
    "title": "...",
    "content": "...",
    "folder": {...}
  }
}
```
- **说明**: 如果资源不存在或未解锁，返回403（不透露资源是否存在）

#### 1.4 更新隐私 item
- **路由**: `PATCH /private/items/:id`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **请求体**:
```json
{
  "title": "新标题",
  "content": "新内容",
  "isStarred": true
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "新标题",
    "content": "新内容",
    "isStarred": true
  }
}
```
- **说明**: 仅允许编辑隐私 item；如果资源不存在或未解锁，返回403

#### 1.5 删除隐私 item（软删）
- **路由**: `DELETE /private/items/:id`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **响应**:
```json
{
  "success": true,
  "message": "项目删除成功"
}
```
- **说明**: 
  - 软删，设置 deletedAt=now
  - 如果资源不存在或未解锁，返回403

### 2. 隐私 Folder 接口

#### 2.1 获取隐私folders列表
- **路由**: `GET /private/folders/list?kind=NOTES`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **查询参数**:
  - `kind` (可选): NOTES 或 URLS
- **响应**:
```json
{
  "success": true,
  "data": [...]
}
```

#### 2.2 获取隐私folder详情
- **路由**: `GET /private/folders/:id`
- **认证**: Bearer Token (JWT) + `X-Private-Token` header
- **响应**:
```json
{
  "success": true,
  "data": {...}
}
```
- **说明**: 如果资源不存在或未解锁，返回403（不透露资源是否存在）

---

## 五、调试接口（仅开发环境，需要登录）

### 1. 获取当前用户信息
- **路由**: `GET /debug/me`
- **认证**: Bearer Token (JWT)
- **响应**:
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "test@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "foldersCount": 6,
    "folders": [
      {
        "id": "...",
        "name": "隐私",
        "kind": "NOTES",
        "isPrivate": true
      },
      {
        "id": "...",
        "name": "分类1",
        "kind": "NOTES",
        "isPrivate": false
      }
    ]
  }
}
```
- **说明**: 用于开发环境调试，查看当前用户信息和 folders 列表

---

## 六、健康检查（无需登录）

### 健康检查
- **路由**: `GET /health`
- **认证**: 无需
- **响应**:
```json
{
  "status": "ok",
  "message": "后端服务运行正常",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 错误响应格式

```json
{
  "statusCode": 401,
  "message": "验证码错误",
  "error": "Unauthorized"
}
```

常见状态码:
- `401`: 未授权（token无效、验证码错误等）
- `403`: 禁止访问（隐私内容未解锁、无权访问等）
- `404`: 资源不存在
- `400`: 请求参数错误

