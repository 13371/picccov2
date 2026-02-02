# API 测试示例

## 前置准备

1. 启动后端服务：`cd backend && npm run start:dev`
2. 获取 JWT Token（通过登录接口）
3. 如需测试隐私接口，先设置隐私密码并获取隐私解锁 Token

---

## 测试步骤

### 步骤 1: 登录获取 Token（新用户会自动创建默认 folders）

```powershell
# PowerShell
# 先请求验证码
Invoke-RestMethod -Uri "http://localhost:3001/auth/request-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com"}'

# 等待几秒，然后从后端日志中获取验证码（开发模式会打印到日志）
# 假设验证码是 123456，使用验证码登录
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/verify-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","code":"123456"}'

$token = $loginResponse.accessToken
Write-Host "Token: $token"
Write-Host "✅ 登录成功！新用户会自动创建默认 folders（查看后端日志确认）"
```

```bash
# curl
# 先请求验证码
curl -X POST http://localhost:3001/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 从后端日志获取验证码，然后登录
curl -X POST http://localhost:3001/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

**说明**: 
- 新用户首次登录时，系统会自动创建默认 folders
- 默认 folders 包括：
  - NOTES: 隐私(isPrivate=true), 分类1, 分类2
  - URLS: 常用, 电商, 工具
- 查看后端日志，应该能看到 "✅ 新用户初始化成功" 的日志

---

### 步骤 1.5: 验证默认 folders（可选 - 使用 debug 接口）

```powershell
# PowerShell
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# 查看当前用户信息和 folders
$debugResponse = Invoke-RestMethod -Uri "http://localhost:3001/debug/me" `
  -Method GET `
  -Headers $headers

Write-Host "用户信息:"
Write-Host "  Email: $($debugResponse.data.email)"
Write-Host "  Folders 数量: $($debugResponse.data.foldersCount)"
Write-Host "`n默认 Folders:"
$debugResponse.data.folders | ForEach-Object {
  Write-Host "  - $($_.name) ($($_.kind)) - 隐私: $($_.isPrivate)"
}
```

```bash
# curl
curl -X GET http://localhost:3001/debug/me \
  -H "Authorization: Bearer $token"
```

---

### 步骤 2: 获取默认 folders 列表

```powershell
# PowerShell
# 获取 NOTES 类型的 folders（不包含隐私）
$notesFolders = Invoke-RestMethod -Uri "http://localhost:3001/folders/list?kind=NOTES" `
  -Method GET `
  -Headers $headers

Write-Host "NOTES Folders (非隐私):"
$notesFolders.data | ForEach-Object {
  Write-Host "  - $($_.name) (ID: $($_.id))"
}

# 获取 URLS 类型的 folders
$urlsFolders = Invoke-RestMethod -Uri "http://localhost:3001/folders/list?kind=URLS" `
  -Method GET `
  -Headers $headers

Write-Host "`nURLS Folders:"
$urlsFolders.data | ForEach-Object {
  Write-Host "  - $($_.name) (ID: $($_.id))"
}

# 保存一个 URLS folder ID 用于后续创建 URL item
$urlFolderId = $urlsFolders.data[0].id
Write-Host "`n使用第一个 URLS folder 创建 URL: $urlFolderId"
```

```bash
# curl
# 获取 NOTES folders
curl -X GET "http://localhost:3001/folders/list?kind=NOTES" \
  -H "Authorization: Bearer $token"

# 获取 URLS folders
curl -X GET "http://localhost:3001/folders/list?kind=URLS" \
  -H "Authorization: Bearer $token"
```

**预期结果**:
- NOTES folders 应该返回：分类1, 分类2（不包含隐私文件夹）
- URLS folders 应该返回：常用, 电商, 工具

---

### 步骤 3: 创建普通 NOTE Item（使用默认 folder）

```powershell
# PowerShell
# 使用默认的 NOTES folder（分类1）
$notesFolderId = $notesFolders.data[0].id

$createItemResponse = Invoke-RestMethod -Uri "http://localhost:3001/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "NOTE"
    title = "普通笔记"
    content = "这是普通笔记的内容"
    folderId = $notesFolderId
  } | ConvertTo-Json)

$itemId = $createItemResponse.data.id
Write-Host "Item ID: $itemId"
```

```bash
# curl
curl -X POST http://localhost:3001/items \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"NOTE\",\"title\":\"普通笔记\",\"content\":\"这是普通笔记的内容\",\"folderId\":\"<notesFolderId>\"}"
```

---

### 步骤 4: 创建 URL Item（使用默认 folder）

```powershell
# PowerShell
# 使用默认的 URLS folder（常用）
$urlFolderId = $urlsFolders.data[0].id

$createUrlResponse = Invoke-RestMethod -Uri "http://localhost:3001/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "URL"
    title = "示例网站"
    url = "https://example.com"
    folderId = $urlFolderId
  } | ConvertTo-Json)

$urlItemId = $createUrlResponse.data.id
Write-Host "URL Item ID: $urlItemId"
```

```bash
# curl
curl -X POST http://localhost:3001/items \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"URL\",\"title\":\"示例网站\",\"url\":\"https://example.com\",\"folderId\":\"<urlFolderId>\"}"
```

---

### 步骤 5: 设置隐私密码（如果尚未设置）

```powershell
# PowerShell
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$createFolderResponse = Invoke-RestMethod -Uri "http://localhost:3001/folders" `
  -Method POST `
  -Headers $headers `
  -Body '{"name":"我的笔记","kind":"NOTES"}'

$folderId = $createFolderResponse.data.id
Write-Host "Folder ID: $folderId"
```

```bash
# curl
curl -X POST http://localhost:3001/folders \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"name":"我的笔记","kind":"NOTES"}'
```

---


```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/private/set-password" `
  -Method POST `
  -Headers $headers `
  -Body '{"password":"1234","confirmPassword":"1234"}'
```

```bash
# curl
curl -X POST http://localhost:3001/private/set-password \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"password":"1234","confirmPassword":"1234"}'
```

---

### 步骤 5: 解锁隐私（获取隐私解锁 Token）

```powershell
# PowerShell
$unlockResponse = Invoke-RestMethod -Uri "http://localhost:3001/private/unlock" `
  -Method POST `
  -Headers $headers `
  -Body '{"password":"1234"}'

$privateToken = $unlockResponse.privateUnlockedToken
Write-Host "Private Token: $privateToken"

$privateHeaders = @{
  "Authorization" = "Bearer $token"
  "X-Private-Token" = $privateToken
  "Content-Type" = "application/json"
}
```

```bash
# curl
curl -X POST http://localhost:3001/private/unlock \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"password":"1234"}'
```

---

### 步骤 6: 创建隐私 NOTE Item

```powershell
# PowerShell
$createPrivateItemResponse = Invoke-RestMethod -Uri "http://localhost:3001/private/items" `
  -Method POST `
  -Headers $privateHeaders `
  -Body '{"title":"隐私笔记","content":"这是隐私笔记的内容"}'

$privateItemId = $createPrivateItemResponse.data.id
Write-Host "Private Item ID: $privateItemId"
```

```bash
# curl
curl -X POST http://localhost:3001/private/items \
  -H "Authorization: Bearer $token" \
  -H "X-Private-Token: $privateToken" \
  -H "Content-Type: application/json" \
  -d '{"title":"隐私笔记","content":"这是隐私笔记的内容"}'
```

---

### 步骤 7: 验证普通 list 看不到隐私 Item

```powershell
# PowerShell
# 获取普通 items 列表（应该只看到普通笔记，看不到隐私笔记）
$publicItems = Invoke-RestMethod -Uri "http://localhost:3001/items/list?type=NOTE" `
  -Method GET `
  -Headers $headers

Write-Host "普通 Items 数量: $($publicItems.data.Count)"
$publicItems.data | ForEach-Object {
  Write-Host "  - $($_.title): $($_.content)"
}
```

```bash
# curl
curl -X GET "http://localhost:3001/items/list?type=NOTE" \
  -H "Authorization: Bearer $token"
```

**预期结果**: 只能看到"普通笔记"，看不到"隐私笔记"

---

### 步骤 8: 验证搜索看不到隐私 Item

```powershell
# PowerShell
# 搜索"隐私"关键词（应该搜不到隐私笔记）
$searchResults = Invoke-RestMethod -Uri "http://localhost:3001/search?q=隐私&type=NOTE" `
  -Method GET `
  -Headers $headers

Write-Host "搜索结果数量: $($searchResults.data.Count)"
$searchResults.data | ForEach-Object {
  Write-Host "  - $($_.title): $($_.content)"
}
```

```bash
# curl
curl -X GET "http://localhost:3001/search?q=隐私&type=NOTE" \
  -H "Authorization: Bearer $token"
```

**预期结果**: 搜不到隐私笔记（硬拦截）

---

### 步骤 9: 验证隐私 list 能看到隐私 Item

```powershell
# PowerShell
# 获取隐私 items 列表（应该能看到隐私笔记）
$privateItems = Invoke-RestMethod -Uri "http://localhost:3001/private/items/list?type=NOTE" `
  -Method GET `
  -Headers $privateHeaders

Write-Host "隐私 Items 数量: $($privateItems.data.Count)"
$privateItems.data | ForEach-Object {
  Write-Host "  - $($_.title): $($_.content)"
}
```

```bash
# curl
curl -X GET "http://localhost:3001/private/items/list?type=NOTE" \
  -H "Authorization: Bearer $token" \
  -H "X-Private-Token: $privateToken"
```

**预期结果**: 能看到"隐私笔记"

---

### 步骤 10: 测试其他 CRUD 操作

#### 10.1 更新普通 Item

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/items/$itemId" `
  -Method PATCH `
  -Headers $headers `
  -Body '{"title":"更新后的标题","isStarred":true}'
```

```bash
# curl
curl -X PATCH "http://localhost:3001/items/$itemId" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"title":"更新后的标题","isStarred":true}'
```

#### 10.2 更新隐私 Item

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/private/items/$privateItemId" `
  -Method PATCH `
  -Headers $privateHeaders `
  -Body '{"title":"更新后的隐私标题","isStarred":true}'
```

```bash
# curl
curl -X PATCH "http://localhost:3001/private/items/$privateItemId" \
  -H "Authorization: Bearer $token" \
  -H "X-Private-Token: $privateToken" \
  -H "Content-Type: application/json" \
  -d '{"title":"更新后的隐私标题","isStarred":true}'
```

#### 10.3 创建 URL Item

```powershell
# PowerShell
# 先创建 URLS folder
$urlFolderResponse = Invoke-RestMethod -Uri "http://localhost:3001/folders" `
  -Method POST `
  -Headers $headers `
  -Body '{"name":"我的书签","kind":"URLS"}'

$urlFolderId = $urlFolderResponse.data.id

# 创建 URL item
Invoke-RestMethod -Uri "http://localhost:3001/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "URL"
    title = "示例网站"
    url = "https://example.com"
    folderId = $urlFolderId
  } | ConvertTo-Json)
```

```bash
# curl
# 创建 URLS folder
curl -X POST http://localhost:3001/folders \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"name":"我的书签","kind":"URLS"}'

# 创建 URL item
curl -X POST http://localhost:3001/items \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"type":"URL","title":"示例网站","url":"https://example.com","folderId":"<urlFolderId>"}'
```

#### 10.4 搜索 URL

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/search?q=example&type=URL" `
  -Method GET `
  -Headers $headers
```

```bash
# curl
curl -X GET "http://localhost:3001/search?q=example&type=URL" \
  -H "Authorization: Bearer $token"
```

#### 10.5 删除 Item（软删）

```powershell
# PowerShell
# 删除普通 item
Invoke-RestMethod -Uri "http://localhost:3001/items/$itemId" `
  -Method DELETE `
  -Headers $headers

# 删除隐私 item
Invoke-RestMethod -Uri "http://localhost:3001/private/items/$privateItemId" `
  -Method DELETE `
  -Headers $privateHeaders
```

```bash
# curl
# 删除普通 item
curl -X DELETE "http://localhost:3001/items/$itemId" \
  -H "Authorization: Bearer $token"

# 删除隐私 item
curl -X DELETE "http://localhost:3001/private/items/$privateItemId" \
  -H "Authorization: Bearer $token" \
  -H "X-Private-Token: $privateToken"
```

#### 10.6 更新 Folder（重命名/星标）

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/folders/$folderId" `
  -Method PATCH `
  -Headers $headers `
  -Body '{"name":"重命名后的文件夹","isStarred":true}'
```

```bash
# curl
curl -X PATCH "http://localhost:3001/folders/$folderId" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d '{"name":"重命名后的文件夹","isStarred":true}'
```

#### 10.7 删除 Folder（仅当为空时）

```powershell
# PowerShell
# 注意：只有当 folder 内没有未删除的 items 时才能删除
Invoke-RestMethod -Uri "http://localhost:3001/folders/$folderId" `
  -Method DELETE `
  -Headers $headers
```

```bash
# curl
curl -X DELETE "http://localhost:3001/folders/$folderId" \
  -H "Authorization: Bearer $token"
```

---

## 完整测试脚本（PowerShell）

```powershell
# 完整测试流程
$baseUrl = "http://localhost:3001"

# 1. 登录
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/verify-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","code":"123456"}'
$token = $loginResponse.accessToken
Write-Host "✓ 登录成功，Token: $token"

# 2. 设置请求头
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# 3. 创建普通文件夹
$folderResponse = Invoke-RestMethod -Uri "$baseUrl/folders" `
  -Method POST `
  -Headers $headers `
  -Body '{"name":"测试笔记","kind":"NOTES"}'
$folderId = $folderResponse.data.id
Write-Host "✓ 创建文件夹成功，ID: $folderId"

# 4. 创建普通 NOTE
$itemResponse = Invoke-RestMethod -Uri "$baseUrl/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "NOTE"
    title = "普通笔记"
    content = "这是普通笔记内容"
    folderId = $folderId
  } | ConvertTo-Json)
$itemId = $itemResponse.data.id
Write-Host "✓ 创建普通 NOTE 成功，ID: $itemId"

# 5. 设置隐私密码
try {
  Invoke-RestMethod -Uri "$baseUrl/private/set-password" `
    -Method POST `
    -Headers $headers `
    -Body '{"password":"1234","confirmPassword":"1234"}' | Out-Null
  Write-Host "✓ 设置隐私密码成功"
} catch {
  Write-Host "⚠ 隐私密码可能已设置，跳过"
}

# 6. 解锁隐私
$unlockResponse = Invoke-RestMethod -Uri "$baseUrl/private/unlock" `
  -Method POST `
  -Headers $headers `
  -Body '{"password":"1234"}'
$privateToken = $unlockResponse.privateUnlockedToken
$privateHeaders = @{
  "Authorization" = "Bearer $token"
  "X-Private-Token" = $privateToken
  "Content-Type" = "application/json"
}
Write-Host "✓ 解锁隐私成功"

# 7. 创建隐私 NOTE
$privateItemResponse = Invoke-RestMethod -Uri "$baseUrl/private/items" `
  -Method POST `
  -Headers $privateHeaders `
  -Body '{"title":"隐私笔记","content":"这是隐私笔记内容"}'
$privateItemId = $privateItemResponse.data.id
Write-Host "✓ 创建隐私 NOTE 成功，ID: $privateItemId"

# 8. 验证普通 list 看不到隐私
$publicList = Invoke-RestMethod -Uri "$baseUrl/items/list?type=NOTE" `
  -Method GET `
  -Headers $headers
Write-Host "`n✓ 普通列表查询结果："
Write-Host "  找到 $($publicList.data.Count) 个普通 items"
$publicList.data | ForEach-Object {
  Write-Host "    - $($_.title)"
}

# 9. 验证搜索看不到隐私
$searchResult = Invoke-RestMethod -Uri "$baseUrl/search?q=隐私&type=NOTE" `
  -Method GET `
  -Headers $headers
Write-Host "`n✓ 搜索结果："
Write-Host "  找到 $($searchResult.data.Count) 个匹配的 items（应该为 0，因为隐私被硬拦截）"

# 10. 验证隐私 list 能看到隐私
$privateList = Invoke-RestMethod -Uri "$baseUrl/private/items/list?type=NOTE" `
  -Method GET `
  -Headers $privateHeaders
Write-Host "`n✓ 隐私列表查询结果："
Write-Host "  找到 $($privateList.data.Count) 个隐私 items"
$privateList.data | ForEach-Object {
  Write-Host "    - $($_.title)"
}

Write-Host "`n✅ 所有测试完成！"
```

---

## 新用户默认 Folders 测试流程

### 完整测试脚本（新用户首次登录）

```powershell
# PowerShell - 新用户默认 folders 测试
$baseUrl = "http://localhost:3001"
$testEmail = "test@example.com"

Write-Host "=== 新用户默认 Folders 测试 ===" -ForegroundColor Green

# 1. 请求验证码
Write-Host "`n1. 请求验证码..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/auth/request-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{ email = $testEmail } | ConvertTo-Json) | Out-Null
Write-Host "✓ 验证码已发送，请查看后端日志获取验证码" -ForegroundColor Green

# 2. 登录（新用户会自动创建默认 folders）
Write-Host "`n2. 登录（新用户会自动创建默认 folders）..." -ForegroundColor Yellow
# 注意：需要从后端日志中获取验证码，这里假设是 123456
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/verify-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    email = $testEmail
    code = "123456"  # 从后端日志获取
  } | ConvertTo-Json)
$token = $loginResponse.accessToken
Write-Host "✓ 登录成功，Token: $token" -ForegroundColor Green
Write-Host "  （查看后端日志，应该能看到 '✅ 新用户初始化成功' 的日志）" -ForegroundColor Cyan

# 3. 设置请求头
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# 4. 验证默认 folders（使用 debug 接口）
Write-Host "`n3. 验证默认 folders..." -ForegroundColor Yellow
$debugResponse = Invoke-RestMethod -Uri "$baseUrl/debug/me" `
  -Method GET `
  -Headers $headers
Write-Host "✓ 用户信息:" -ForegroundColor Green
Write-Host "  Email: $($debugResponse.data.email)"
Write-Host "  Folders 数量: $($debugResponse.data.foldersCount)"
Write-Host "`n  默认 Folders 列表:" -ForegroundColor Cyan
$debugResponse.data.folders | ForEach-Object {
  $privacy = if ($_.isPrivate) { "隐私" } else { "公开" }
  Write-Host "    - $($_.name) ($($_.kind)) - $privacy"
}

# 5. 获取 NOTES folders（不包含隐私）
Write-Host "`n4. 获取 NOTES folders（不包含隐私）..." -ForegroundColor Yellow
$notesFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=NOTES" `
  -Method GET `
  -Headers $headers
Write-Host "✓ NOTES Folders (非隐私):" -ForegroundColor Green
$notesFolders.data | ForEach-Object {
  Write-Host "    - $($_.name) (ID: $($_.id))"
}
if ($notesFolders.data.Count -lt 2) {
  Write-Host "  ⚠️  警告：应该至少有 2 个 NOTES folders（分类1, 分类2）" -ForegroundColor Red
}

# 6. 获取 URLS folders
Write-Host "`n5. 获取 URLS folders..." -ForegroundColor Yellow
$urlsFolders = Invoke-RestMethod -Uri "$baseUrl/folders/list?kind=URLS" `
  -Method GET `
  -Headers $headers
Write-Host "✓ URLS Folders:" -ForegroundColor Green
$urlsFolders.data | ForEach-Object {
  Write-Host "    - $($_.name) (ID: $($_.id))"
}
if ($urlsFolders.data.Count -lt 3) {
  Write-Host "  ⚠️  警告：应该至少有 3 个 URLS folders（常用, 电商, 工具）" -ForegroundColor Red
}

# 7. 使用默认 folder 创建 NOTE
Write-Host "`n6. 使用默认 NOTES folder 创建 NOTE..." -ForegroundColor Yellow
$notesFolderId = $notesFolders.data[0].id
$createNoteResponse = Invoke-RestMethod -Uri "$baseUrl/items" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    type = "NOTE"
    title = "测试笔记"
    content = "这是使用默认 folder 创建的笔记"
    folderId = $notesFolderId
  } | ConvertTo-Json)
Write-Host "✓ NOTE 创建成功，ID: $($createNoteResponse.data.id)" -ForegroundColor Green

# 8. 使用默认 folder 创建 URL
Write-Host "`n7. 使用默认 URLS folder 创建 URL..." -ForegroundColor Yellow
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
Write-Host "✓ URL 创建成功，ID: $($createUrlResponse.data.id)" -ForegroundColor Green

# 9. 验证幂等性（再次登录不应重复创建）
Write-Host "`n8. 验证幂等性（再次登录不应重复创建 folders）..." -ForegroundColor Yellow
# 再次请求验证码并登录
Invoke-RestMethod -Uri "$baseUrl/auth/request-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{ email = $testEmail } | ConvertTo-Json) | Out-Null
# 假设新的验证码是 654321
$loginResponse2 = Invoke-RestMethod -Uri "$baseUrl/auth/verify-code" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    email = $testEmail
    code = "654321"  # 从后端日志获取新验证码
  } | ConvertTo-Json)
$token2 = $loginResponse2.accessToken
$headers2 = @{
  "Authorization" = "Bearer $token2"
  "Content-Type" = "application/json"
}
$debugResponse2 = Invoke-RestMethod -Uri "$baseUrl/debug/me" `
  -Method GET `
  -Headers $headers2
if ($debugResponse2.data.foldersCount -eq $debugResponse.data.foldersCount) {
  Write-Host "✓ 幂等性验证通过：folders 数量未增加" -ForegroundColor Green
} else {
  Write-Host "  ⚠️  警告：folders 数量增加了，可能重复创建了" -ForegroundColor Red
}

Write-Host "`n✅ 新用户默认 Folders 测试完成！" -ForegroundColor Green
```

---

## 注意事项

1. **隐私硬拦截**: 普通接口（`/items/list`, `/search`）永远不会返回隐私 items，无论搜索关键词是什么
2. **软删除**: 删除操作是软删除，设置 `deletedAt` 字段，不会真正从数据库删除
3. **文件夹删除限制**: 只有当文件夹内没有未删除的 items 时才能删除文件夹
4. **类型匹配**: NOTE items 只能放在 NOTES 类型的 folder 中，URL items 只能放在 URLS 类型的 folder 中
5. **Title 长度限制**: title 最多 10 个字符，超过会返回 400 错误
6. **新用户默认 Folders**: 
   - 新用户首次登录时，系统会自动创建默认 folders
   - NOTES: 隐私(isPrivate=true), 分类1, 分类2
   - URLS: 常用, 电商, 工具
   - 使用 `createMany` + `skipDuplicates` 确保幂等（重复登录不会重复创建）
   - `/folders/list?kind=NOTES` 只返回非隐私 folders（分类1, 分类2）
   - `/folders/list?kind=URLS` 返回所有 URLS folders（常用, 电商, 工具）
