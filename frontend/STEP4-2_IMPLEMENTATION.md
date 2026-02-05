# Step4-2 前端基础壳实现说明

## 关键文件列表与改动说明

### 1. 组件文件（新建）

#### `components/Header.tsx`
- **功能**: 顶部固定 Header 组件
- **特性**:
  - 左侧：+ 按钮（新建 NOTE，目前为占位）
  - 中间：应用名 "piccco"
  - 右侧：搜索按钮（打开搜索页，目前为占位）
- **样式**: `position: fixed; top: 0; z-index: 1000`

#### `components/TabBar.tsx`
- **功能**: 底部固定 Tab Bar 组件
- **特性**:
  - 4 个 Tab：首页、网址、分类、我的
  - 使用 Next.js Link 进行路由切换
  - 根据当前路径高亮激活的 Tab
  - 路由映射：/home, /urls, /categories, /me
- **样式**: `position: fixed; bottom: 0; z-index: 1000`

### 2. 布局文件（修改）

#### `app/layout.tsx`
- **改动**: 集成 Header 和 TabBar 组件
- **结构**:
  ```tsx
  <body>
    <Header />
    <main className="main-content">
      {children}
    </main>
    <TabBar />
  </body>
  ```

### 3. 页面文件（新建）

#### `app/home/page.tsx`
- **路由**: `/home`
- **内容**: 首页占位（后续做大白框+列表）

#### `app/urls/page.tsx`
- **路由**: `/urls`
- **内容**: 网址页面占位（后续做 URL 文件夹）

#### `app/categories/page.tsx`
- **路由**: `/categories`
- **内容**: 分类页面占位（后续做 NOTES 文件夹）

#### `app/me/page.tsx`
- **路由**: `/me`
- **内容**: 我的页面占位（后续展示邮箱、信息中心/设置/账号与安全/帮助与反馈/关于）

#### `app/page.tsx`（修改）
- **改动**: 重定向到 `/home`

### 4. 样式文件（修改）

#### `app/globals.css`
- **新增样式**:
  - `.header`: 顶部固定栏样式（高度 56px）
  - `.tab-bar`: 底部固定导航样式（高度 60px）
  - `.main-content`: 主内容区域（padding-top: 56px, padding-bottom: 60px）
  - `.page-container`: 页面容器样式
  - `.tab-item`: Tab 项样式（包含激活状态）
  - 响应式交互效果（hover、active）

## 目录结构

```
frontend/
├── app/
│   ├── layout.tsx          # 全局布局（集成 Header 和 TabBar）
│   ├── page.tsx            # 根页面（重定向到 /home）
│   ├── globals.css         # 全局样式
│   ├── home/
│   │   └── page.tsx        # 首页
│   ├── urls/
│   │   └── page.tsx        # 网址页
│   ├── categories/
│   │   └── page.tsx        # 分类页
│   └── me/
│       └── page.tsx        # 我的页
└── components/
    ├── Header.tsx           # 顶部固定栏
    └── TabBar.tsx           # 底部固定导航
```

## 如何本地运行与验证

### 1. 启动开发服务器

```bash
# 在项目根目录
cd frontend
pnpm dev
```

或者从根目录直接运行：

```bash
pnpm --filter frontend dev
```

### 2. 访问应用

打开浏览器访问：`http://localhost:3000`

- 会自动重定向到 `/home`
- 可以看到顶部固定 Header（piccco 标题）
- 可以看到底部固定 TabBar（4 个 Tab）

### 3. 验证功能

#### 3.1 路由切换测试
1. 点击底部 TabBar 的各个 Tab：
   - 点击"首页" → 跳转到 `/home`
   - 点击"网址" → 跳转到 `/urls`
   - 点击"分类" → 跳转到 `/categories`
   - 点击"我的" → 跳转到 `/me`
2. 验证：URL 地址栏会相应变化，页面内容会切换

#### 3.2 固定布局测试
1. 访问任意页面（如 `/home`）
2. 滚动页面内容（页面中有占位内容可以滚动）
3. 验证：
   - ✅ Header 始终固定在顶部，不会随页面滚动
   - ✅ TabBar 始终固定在底部，不会随页面滚动
   - ✅ 中间内容区域可以正常滚动
   - ✅ 内容区域有正确的 padding，不会被 Header 和 TabBar 遮挡

#### 3.3 交互测试
1. 点击 Header 左侧的 `+` 按钮：
   - 控制台会输出 "打开新建 NOTE"（占位功能）
2. 点击 Header 右侧的搜索按钮：
   - 控制台会输出 "打开搜索页"（占位功能）
3. 点击 TabBar 的 Tab：
   - Tab 会高亮显示（激活状态）
   - 页面会切换到对应路由

### 4. 验证清单

- [ ] 访问 `http://localhost:3000` 自动跳转到 `/home`
- [ ] 顶部 Header 固定，显示 "piccco" 标题
- [ ] 底部 TabBar 固定，显示 4 个 Tab
- [ ] 点击 Tab 可以切换路由（/home, /urls, /categories, /me）
- [ ] 滚动页面时，Header 和 TabBar 保持固定不动
- [ ] 内容区域有足够的 padding，不会被遮挡
- [ ] 激活的 Tab 会高亮显示
- [ ] Header 按钮有 hover 效果

## 技术实现要点

1. **固定定位**: 使用 `position: fixed` 实现 Header 和 TabBar 的固定效果
2. **内容区域**: 使用 `padding-top` 和 `padding-bottom` 为内容区域留出空间
3. **路由**: 使用 Next.js App Router 的文件系统路由
4. **客户端组件**: Header 和 TabBar 使用 `'use client'` 指令，支持交互
5. **样式**: 纯 CSS 实现，无外部 UI 框架依赖

## 后续开发提示

1. **新建 NOTE 功能**: 在 `Header.tsx` 的 `handleNewNote` 中实现打开编辑页逻辑
2. **搜索功能**: 在 `Header.tsx` 的 `handleSearch` 中实现打开搜索页逻辑
3. **页面内容**: 在各个页面文件中实现具体业务逻辑
4. **状态管理**: 如需全局状态，可考虑使用 Context API 或状态管理库



