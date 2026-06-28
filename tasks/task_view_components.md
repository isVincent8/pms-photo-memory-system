# Task: 核心视图组件（Timeline, Stage, Album）开发

**负责人**: Agent — 核心视图组件专家  
**优先级**: P2（依赖前端基础架构 Agent 的页面骨架）  
**预计工时**: 4-5 天  
**前置依赖**: 前端基础架构 Agent 完成 `views/` 页面骨架 + `src/types/` 类型定义  

---

## 一、任务范围与边界

**负责内容**：
- Timeline 视图（发送人生 / 时间线总览）
- Stage 视图（单阶段详细内容展示）
- Album 视图（相册页展示）
- 各视图的数据获取、状态绑定、UI 渲染

**不碰内容**：
- 地图交互 (`MapView`) 和 `MapDetailOverlay`（由地图功能 Agent 负责）
- 全局数据加载逻辑（由前端基础架构 Agent 的 `dataStore` 负责）
- Markdown 解析（由数据工程 Agent 负责，你调用 `MarkdownRenderer` 组件）

> ⚠️ **跨 Agent 约定**：你的组件只负责视图渲染和数据绑定，所有数据获取通过 `dataStore` 或 `src/api/` 中的函数，不要直接操作本地文件或 Markdown 解析。

---

## 二、核心目标与验收标准

| 目标 | 验收标准（Definition of Done） |
|------|-------------------------------|
| 1. Timeline 视图 | 左侧列出所有阶段列表，右侧展示选中阶段的内容；阶段切换流畅；支持阶段筛选 |
| 2. Stage 视图 | 展示单阶段的 Markdown 解析内容与照片；照片布局优雅；支持懒加载 |
| 3. Album 视图 | 展示相册内所有照片；网格/瀑布流布局；点击可放大（Lightbox 效果） |
| 4. 响应式设计 | 桌面端与移动端体验一致，侧边栏在移动端可折叠 |
| 5. 视觉风格贴合 | 严格遵循黑色背景 + 火红/橙红高光的极简主义风格 |

---

## 三、输入与依赖

### 输入
- 根目录 `PMS_Photo_Memory_System_开发指导文档.md` 中「五、UI 与功能组件详细设计」章节
- 前端基础架构 Agent 提供的 `src/types/index.ts` 类型定义
- 前端基础架构 Agent 提供的 `src/components/MarkdownRenderer.vue`, `src/components/PhotoGrid.vue` 组件

### 外部依赖

| 接口方 | 接口内容 |
|--------|---------|
| **前端基础架构 Agent** | 使用 `src/types/index.ts` 中的类型；使用 `dataStore` 获取数据；使用 `MarkdownRenderer`, `PhotoGrid` 组件 |
| **数据工程 Agent** | `index.json` 的数据结构 |

---

## 四、详细技术任务

### Task 3.1: Timeline 视图开发（`TimelineView.vue`）

- **布局**：左右分栏
  - **左手边**：阶段列表（Stage List）
    - 展示所有阶段名称、时间范围
    - 支持按时间排序 / 按字母排序
    - 点击阶段切换右侧内容
  - **右手边**：选中阶段的内容展示（复用 Stage 视图逻辑）
    - Markdown 渲染
    - 照片网格
- **交互**：
  - 阶段切换时滚动位置保存
  - 支持 URL 直接访问 `/stage/:id`

### Task 3.2: Stage 视图开发（`StageView.vue`）

- **布局**：全宽内容区，顶部是阶段标题与时间，下方是 Markdown 内容 + 照片
- **内容渲染**：
  - Markdown → 使用 `MarkdownRenderer` 组件
  - 照片 → 使用 `PhotoGrid` 组件
- **照片处理**：
  - 照片按页面宽度自适应
  - 支持懒加载（Intersection Observer）
  - 点击放大预览

### Task 3.3: Album 视图开发（`AlbumView.vue`）

- **布局**：网格/瀑布流布局，每张照片等宽不等高
- **功能**：
  - 照片悬停显示拍摄时间/地点
  - 点击照片打开 Lightbox 弹窗
  - Lightbox 支持左右滑动切换
- **主题切合**：
  - 背景黑色，照片边框使用极细暗色边框
  - 悬停信息使用深色半透明浮层 + 白色文字

### Task 3.4: 响应式适配

- 桌面端（≥768px）：左右分栏
- 移动端（<768px）：单列，阶段列表变为可折叠的侧边滑出面板

---

## 五、预期产出

| 产出物 | 路径 |
|--------|------|
| Timeline 视图 | `src/views/TimelineView.vue` |
| Stage 视图 | `src/views/StageView.vue` |
| Album 视图 | `src/views/AlbumView.vue` |
| 各视图的子组件 | `src/components/timeline/`, `src/components/stage/`, `src/components/album/` |
| 单元测试（可选） | `tests/unit/views/` |

---

## 六、完成确认清单

- [x] Timeline 视图完整可用，阶段切换无卡顿
- [x] Stage 视图正确渲染 Markdown 和照片
- [x] Album 视图网格布局正常，Lightbox 可用
- [x] 移动端侧边栏可折叠
- [x] 视觉风格与文档一致（黑色背景、火红/橙红高光）
- [x] 所有类型导入正确，无 TypeScript 报错
