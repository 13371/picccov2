# 修复 URLS Folder 404 问题

## 问题描述

之前 URLS folder 在查询时被误过滤导致 404：
- `GET /folders/list?kind=URLS` 能返回 URLS folders
- 但对同一个 URLS folder 的 id 调 `GET /folders/:id` 返回 404
- 创建 URL item 时传入该 folderId 也 404

## 修复内容

### 1. FoldersService 修复

**新增方法**: `getPublicFolderById(userId, folderId)`
- where 条件：`{ id: folderId, userId, isPrivate: false }`
- **不限制 kind**，支持 NOTES 和 URLS
- 如果不存在或无权访问，返回 404

**修改方法**: `getPublicFolder(userId, folderId)`
- 现在调用 `getPublicFolderById`，保持向后兼容

### 2. ItemsService 修复

**修改方法**: `createItem`, `updateItem`, `getPublicItems`
- 使用 `FoldersService.getPublicFolderById` 获取 folder
- 先获取 folder（确保非隐私且属于当前用户），再校验 kind 匹配
- 错误信息明确：
  - folder 不存在：返回 404
  - kind 不匹配：返回 400（明确提示类型不匹配）

### 3. 模块依赖

- `ItemsModule` 导入 `FoldersModule`（使用 FoldersService）

## 验证测试

### 测试 1: URLS folder 查询不再 404

```powershell
# PowerShell
$baseUrl = "http://localhost:3001"
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# 1. 获取 URLS folders 列表
$urlsFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=URLS" `
  -Method GET `
  -Headers $headers

Write-Host "URLS Folders:"
$urlsFolders.data | ForEach-Object {
  Write-Host "  - $($_.name) (ID: $($_.id))"
}

# 2. 使用第一个 URLS folder 的 id 查询详情（应该不再 404）
$urlFolderId = $urlsFolders.data[0].id
$folderDetail = Invoke-RestMethod -Uri "$baseUrl/folders/$urlFolderId" `
  -Method GET `
  -Headers $headers

Write-Host "`nFolder 详情:"
Write-Host "  Name: $($folderDetail.data.name)"
Write-Host "  Kind: $($folderDetail.data.kind)"
Write-Host "  IsPrivate: $($folderDetail.data.isPrivate)"
```

```bash
# curl
# 1. 获取 URLS folders 列表
curl -X GET "http://localhost:3001/folders/list?kind=URLS" \
  -H "Authorization: Bearer $token"

# 2. 使用 folder id 查询详情（应该不再 404）
curl -X GET "http://localhost:3001/folders/<urlFolderId>" \
  -H "Authorization: Bearer $token"
```

**预期结果**: 
- ✅ `GET /folders/:id` 返回 200，不再 404
- ✅ 返回的 folder 信息正确（name, kind, isPrivate）

### 测试 2: URL item + URLS folderId 创建成功

```powershell
# PowerShell
# 使用 URLS folder 创建 URL item（应该成功）
$urlFolderId = $urlsFolders.data[0].id

$createUrlResponse = Invoke-RestMethod -Uri "$baseUrl/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "URL"
    title = "测试网站"
    url = "https://example.com"
    folderId = $urlFolderId
  } | ConvertTo-Json)

Write-Host "✅ URL item 创建成功，ID: $($createUrlResponse.data.id)"
```

```bash
# curl
curl -X POST http://localhost:3001/items \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"URL\",
    \"title\": \"测试网站\",
    \"url\": \"https://example.com\",
    \"folderId\": \"<urlFolderId>\"
  }"
```

**预期结果**: 
- ✅ 创建成功，返回 200
- ✅ 返回的 item 包含正确的 folder 信息

### 测试 3: URL item + NOTES folderId 返回 400

```powershell
# PowerShell
# 获取 NOTES folder
$notesFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=NOTES" `
  -Method GET `
  -Headers $headers

$notesFolderId = $notesFolders.data[0].id

# 尝试使用 NOTES folder 创建 URL item（应该返回 400）
try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "URL"
      title = "测试网站"
      url = "https://example.com"
      folderId = $notesFolderId
    } | ConvertTo-Json)
} catch {
  $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "✅ 正确返回 400 错误"
  Write-Host "  错误信息: $($errorResponse.message)"
  if ($errorResponse.message -like "*文件夹类型与项目类型不匹配*") {
    Write-Host "  ✅ 错误信息明确提示类型不匹配"
  }
}
```

```bash
# curl
# 尝试使用 NOTES folder 创建 URL item（应该返回 400）
curl -X POST http://localhost:3001/items \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"URL\",
    \"title\": \"测试网站\",
    \"url\": \"https://example.com\",
    \"folderId\": \"<notesFolderId>\"
  }"
```

**预期结果**: 
- ✅ 返回 400 Bad Request
- ✅ 错误信息明确提示："文件夹类型与项目类型不匹配：文件夹类型为 NOTES，项目类型为 URL，期望文件夹类型为 URLS"

### 测试 4: NOTE item + URLS folderId 返回 400

```powershell
# PowerShell
# 尝试使用 URLS folder 创建 NOTE item（应该返回 400）
try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "NOTE"
      title = "测试笔记"
      content = "这是测试内容"
      folderId = $urlFolderId
    } | ConvertTo-Json)
} catch {
  $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "✅ 正确返回 400 错误"
  Write-Host "  错误信息: $($errorResponse.message)"
  if ($errorResponse.message -like "*文件夹类型与项目类型不匹配*") {
    Write-Host "  ✅ 错误信息明确提示类型不匹配"
  }
}
```

**预期结果**: 
- ✅ 返回 400 Bad Request
- ✅ 错误信息明确提示："文件夹类型与项目类型不匹配：文件夹类型为 URLS，项目类型为 NOTE，期望文件夹类型为 NOTES"

### 测试 5: 不存在的 folderId 返回 404

```powershell
# PowerShell
# 尝试使用不存在的 folderId 创建 item（应该返回 404）
try {
  Invoke-RestMethod -Uri "$baseUrl/items" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      type = "URL"
      title = "测试网站"
      url = "https://example.com"
      folderId = "00000000-0000-0000-0000-000000000000"
    } | ConvertTo-Json)
} catch {
  $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "✅ 正确返回 404 错误"
  Write-Host "  错误信息: $($errorResponse.message)"
  if ($errorResponse.message -like "*文件夹不存在*") {
    Write-Host "  ✅ 错误信息明确提示文件夹不存在"
  }
}
```

**预期结果**: 
- ✅ 返回 404 Not Found
- ✅ 错误信息："文件夹不存在或无权访问"

## 完整测试脚本

```powershell
# PowerShell - 完整测试脚本
$baseUrl = "http://localhost:3001"
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "=== URLS Folder 404 修复验证 ===" -ForegroundColor Green

# 1. 获取 URLS folders
Write-Host "`n1. 获取 URLS folders..." -ForegroundColor Yellow
$urlsFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=URLS" `
  -Method GET `
  -Headers $headers
$urlFolderId = $urlsFolders.data[0].id
Write-Host "✓ 找到 $($urlsFolders.data.Count) 个 URLS folders" -ForegroundColor Green

# 2. 查询 URLS folder 详情（应该不再 404）
Write-Host "`n2. 查询 URLS folder 详情..." -ForegroundColor Yellow
try {
  $folderDetail = Invoke-RestMethod -Uri "$baseUrl/folders/$urlFolderId" `
    -Method GET `
    -Headers $headers
  Write-Host "✓ GET /folders/:id 成功，不再 404" -ForegroundColor Green
  Write-Host "  Folder: $($folderDetail.data.name) ($($folderDetail.data.kind))"
} catch {
  Write-Host "✗ GET /folders/:id 仍然 404" -ForegroundColor Red
}

# 3. 使用 URLS folder 创建 URL item（应该成功）
Write-Host "`n3. 使用 URLS folder 创建 URL item..." -ForegroundColor Yellow
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
  Write-Host "✓ URL item 创建成功" -ForegroundColor Green
  Write-Host "  Item ID: $($createUrlResponse.data.id)"
} catch {
  Write-Host "✗ URL item 创建失败" -ForegroundColor Red
  Write-Host "  错误: $($_.Exception.Message)"
}

# 4. 使用 NOTES folder 创建 URL item（应该返回 400）
Write-Host "`n4. 使用 NOTES folder 创建 URL item（应该返回 400）..." -ForegroundColor Yellow
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
    Write-Host "✓ 正确返回 400 错误" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  错误信息: $($errorResponse.message)"
  } else {
    Write-Host "✗ 返回了错误的状态码: $statusCode" -ForegroundColor Red
  }
}

Write-Host "`n✅ 所有测试完成！" -ForegroundColor Green
```

## 修复总结

1. ✅ `GET /folders/:id` 现在支持 URLS folder，不再 404
2. ✅ `POST /items` 和 `PATCH /items/:id` 使用 `FoldersService.getPublicFolderById` 获取 folder
3. ✅ 错误信息明确：
   - folder 不存在：404 "文件夹不存在或无权访问"
   - kind 不匹配：400 "文件夹类型与项目类型不匹配：..."
4. ✅ 保持隐私硬拦截：普通接口永远不返回 `isPrivate=true` 的 folder/item


