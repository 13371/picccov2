# Folder 查询逻辑统一修复

## 修复目标

彻底统一 folder 查询逻辑，只保留一个 `getPublicFolderById` 方法，删除所有在 where 条件中包含 `kind` 的查询。

## 修改总结

### 一、统一的 folder 查询方法

**方法**: `FoldersService.getPublicFolderById(userId, folderId)`

```typescript
async getPublicFolderById(userId: string, folderId: string) {
  const folder = await this.prisma.folder.findFirst({
    where: {
      id: folderId,
      userId,
      isPrivate: false,
    },
  });

  if (!folder) {
    throw new NotFoundException('文件夹不存在或无权访问');
  }

  return folder;
}
```

**特点**:
- ✅ where 条件只包含：`id`, `userId`, `isPrivate: false`
- ✅ **不限制 kind**，支持 NOTES 和 URLS
- ✅ 全项目唯一的"普通 folder 查询"方法

### 二、被删除的 where 条件（Diff）

#### 1. FoldersService.updateFolder

**删除前**:
```typescript
const folder = await this.prisma.folder.findFirst({
  where: {
    id: folderId,
    userId,
    // ❌ 没有 isPrivate: false，需要后续检查
  },
});
```

**删除后**:
```typescript
// ✅ 使用统一的 getPublicFolderById 方法
const folder = await this.getPublicFolderById(userId, folderId);
```

#### 2. FoldersService.deleteFolder

**删除前**:
```typescript
const folder = await this.prisma.folder.findFirst({
  where: {
    id: folderId,
    userId,
    // ❌ 没有 isPrivate: false，需要后续检查
  },
  include: {
    items: { ... }
  },
});
```

**删除后**:
```typescript
// ✅ 使用统一的 getPublicFolderById 方法验证
await this.getPublicFolderById(userId, folderId);
// 单独查询 items 数量
const itemsCount = await this.prisma.item.count({ ... });
```

### 三、被修改的 Service / Controller

#### 1. FoldersService
- ✅ `getPublicFolderById`: 统一方法，where 只包含 `id, userId, isPrivate: false`
- ✅ `updateFolder`: 使用 `getPublicFolderById` 替换直接查询
- ✅ `deleteFolder`: 使用 `getPublicFolderById` 替换直接查询

#### 2. ItemsService
- ✅ `createItem`: 已使用 `getPublicFolderById`，kind 校验在逻辑层
- ✅ `updateItem`: 已使用 `getPublicFolderById`，kind 校验在逻辑层
- ✅ `getPublicItems`: 已使用 `getPublicFolderById`，kind 校验在逻辑层

#### 3. FoldersController
- ✅ `GET /folders/:id`: 通过 `getPublicFolder` 调用 `getPublicFolderById`

### 四、保留的 prisma.folder.findFirst 调用（合理）

以下调用是合理的，**不需要**替换：

1. **`getPublicFolderById` 本身** - 这是唯一的方法
2. **`getPrivateFolder`** - 隐私 folder 查询（`isPrivate: true`）
3. **`createFolder` 中的重名检查** - 创建时的业务逻辑检查
4. **`updateFolder` 中的重名检查** - 更新时的业务逻辑检查
5. **`ItemsService.createPrivateItem` 中的隐私 folder 查询** - 隐私业务逻辑

### 五、Kind 校验逻辑（在逻辑层，不在 where）

所有 kind 校验都在获取 folder 之后进行：

```typescript
// 1. 先获取 folder（不限制 kind）
const folder = await this.foldersService.getPublicFolderById(userId, folderId);

// 2. 在逻辑层校验 kind
const expectedKind = data.type === ItemType.NOTE ? FolderKind.NOTES : FolderKind.URLS;
if (folder.kind !== expectedKind) {
  throw new BadRequestException('文件夹类型与项目类型不匹配');
}
```

## 验证测试

### 测试 1: GET /folders/{URLS_FOLDER_ID} 返回 200

```powershell
# PowerShell
$baseUrl = "http://localhost:3001"
$headers = @{
  "Authorization" = "Bearer $token"
}

# 获取 URLS folder id
$urlsFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=URLS" `
  -Method GET `
  -Headers $headers
$urlFolderId = $urlsFolders.data[0].id

# 查询 folder 详情（应该返回 200）
$folderDetail = Invoke-RestMethod -Uri "$baseUrl/folders/$urlFolderId" `
  -Method GET `
  -Headers $headers

Write-Host "✅ GET /folders/$urlFolderId 返回 200"
Write-Host "  Name: $($folderDetail.data.name)"
Write-Host "  Kind: $($folderDetail.data.kind)"
Write-Host "  IsPrivate: $($folderDetail.data.isPrivate)"
```

**预期结果**: ✅ 返回 200，不再 404

### 测试 2: POST /items + URL + URLS folderId → 201

```powershell
# PowerShell
$createUrlResponse = Invoke-RestMethod -Uri "$baseUrl/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "URL"
    title = "测试网站"
    url = "https://example.com"
    folderId = $urlFolderId
  } | ConvertTo-Json)

Write-Host "✅ POST /items + URL + URLS folderId 返回 201"
Write-Host "  Item ID: $($createUrlResponse.data.id)"
Write-Host "  Folder: $($createUrlResponse.data.folder.name)"
```

**预期结果**: ✅ 返回 201，创建成功

### 测试 3: POST /items + URL + NOTES folderId → 400

```powershell
# PowerShell
$notesFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=NOTES" `
  -Method GET `
  -Headers $headers
$notesFolderId = $notesFolders.data[0].id

try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "URL"
      title = "测试网站"
      url = "https://example.com"
      folderId = $notesFolderId
    } | ConvertTo-Json) | Out-Null
  Write-Host "✗ 应该返回 400，但创建成功了" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 400) {
    Write-Host "✅ POST /items + URL + NOTES folderId 返回 400" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  错误信息: $($errorResponse.message)"
  }
}
```

**预期结果**: ✅ 返回 400，错误信息："文件夹类型与项目类型不匹配"

### 测试 4: POST /items + NOTE + URLS folderId → 400

```powershell
# PowerShell
try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "NOTE"
      title = "测试笔记"
      content = "这是测试内容"
      folderId = $urlFolderId
    } | ConvertTo-Json) | Out-Null
  Write-Host "✗ 应该返回 400，但创建成功了" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 400) {
    Write-Host "✅ POST /items + NOTE + URLS folderId 返回 400" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  错误信息: $($errorResponse.message)"
  }
}
```

**预期结果**: ✅ 返回 400，错误信息："文件夹类型与项目类型不匹配"

### 测试 5: 普通接口仍然永远拿不到 isPrivate=true 的 folder

```powershell
# PowerShell
# 尝试查询隐私 folder（应该返回 404）
# 注意：需要先知道一个隐私 folder 的 id（可以通过 /debug/me 获取）

try {
  Invoke-RestMethod -Uri "$baseUrl/folders/<privateFolderId>" `
    -Method GET `
    -Headers $headers | Out-Null
  Write-Host "✗ 应该返回 404，但查询成功了" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 404) {
    Write-Host "✅ 普通接口无法查询隐私 folder，返回 404" -ForegroundColor Green
  }
}
```

**预期结果**: ✅ 返回 404，隐私 folder 被硬拦截

## 完整验证脚本

```powershell
# PowerShell - 完整验证脚本
$baseUrl = "http://localhost:3001"
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "=== Folder 查询逻辑统一验证 ===" -ForegroundColor Green

# 1. 获取 folders
$urlsFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=URLS" `
  -Method GET `
  -Headers $headers
$urlFolderId = $urlsFolders.data[0].id

$notesFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=NOTES" `
  -Method GET `
  -Headers $headers
$notesFolderId = $notesFolders.data[0].id

# 2. 测试 1: GET /folders/{URLS_FOLDER_ID} 返回 200
Write-Host "`n测试 1: GET /folders/{URLS_FOLDER_ID}" -ForegroundColor Yellow
try {
  $folderDetail = Invoke-RestMethod -Uri "$baseUrl/folders/$urlFolderId" `
    -Method GET `
    -Headers $headers
  Write-Host "✅ 返回 200" -ForegroundColor Green
  Write-Host "  Folder: $($folderDetail.data.name) ($($folderDetail.data.kind))"
} catch {
  Write-Host "✗ 返回错误: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. 测试 2: POST /items + URL + URLS folderId → 201
Write-Host "`n测试 2: POST /items + URL + URLS folderId" -ForegroundColor Yellow
try {
  $createUrlResponse = Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "URL"
      title = "测试网站"
      url = "https://example.com"
      folderId = $urlFolderId
    } | ConvertTo-Json)
  Write-Host "✅ 返回 201，创建成功" -ForegroundColor Green
  Write-Host "  Item ID: $($createUrlResponse.data.id)"
} catch {
  Write-Host "✗ 创建失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. 测试 3: POST /items + URL + NOTES folderId → 400
Write-Host "`n测试 3: POST /items + URL + NOTES folderId" -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "URL"
      title = "测试网站"
      url = "https://example.com"
      folderId = $notesFolderId
    } | ConvertTo-Json) | Out-Null
  Write-Host "✗ 应该返回 400，但创建成功了" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 400) {
    Write-Host "✅ 返回 400" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  错误: $($errorResponse.message)"
  } else {
    Write-Host "✗ 返回了错误的状态码: $statusCode" -ForegroundColor Red
  }
}

# 5. 测试 4: POST /items + NOTE + URLS folderId → 400
Write-Host "`n测试 4: POST /items + NOTE + URLS folderId" -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "NOTE"
      title = "测试笔记"
      content = "这是测试内容"
      folderId = $urlFolderId
    } | ConvertTo-Json) | Out-Null
  Write-Host "✗ 应该返回 400，但创建成功了" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 400) {
    Write-Host "✅ 返回 400" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  错误: $($errorResponse.message)"
  } else {
    Write-Host "✗ 返回了错误的状态码: $statusCode" -ForegroundColor Red
  }
}

Write-Host "`n✅ 所有验证完成！" -ForegroundColor Green
```

## 修复总结

1. ✅ **统一查询方法**: 只保留 `getPublicFolderById`，where 条件只包含 `id, userId, isPrivate: false`
2. ✅ **删除 kind 限制**: 所有 where 条件中不再包含 `kind: FolderKind.NOTES` 或 `kind: FolderKind.URLS`
3. ✅ **逻辑层校验**: kind 校验都在获取 folder 之后进行
4. ✅ **替换所有直接查询**: `updateFolder` 和 `deleteFolder` 都使用 `getPublicFolderById`
5. ✅ **保持隐私硬拦截**: 普通接口永远拿不到 `isPrivate=true` 的 folder

