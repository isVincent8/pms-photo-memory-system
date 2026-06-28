# Task: 前端基础架构与状态管理开发

**负责人**: Agent — 前端架构专家  
**优先级**: P1（与数据工程并行或稍后启动）  
**预计工时**: 3-4 天  
**前置依赖**: 数据工程 Agent 定义的 `public/data/index.json` 数据接口  

---

## 一、任务范围与边界

**负责内容**：
- Vue 3 + Vite 项目脚手架搭建
- 全局状态管理（Pinia）
- 路由配置与页面骨架
- 共享组件与工具函数
- API 数据加载与缓存逻辑
- TypeScript 类型定义统一维护

**不碰内容**：
- Markdown 解析逻辑（数据工程 Agent 负责）
- 具体视图的业务逻辑和 UI 渲染（各视图组件 Agent 负责）
- 地图集成（地图功能 Agent 负责）

> ⚠️ **跨 Agent 约定**：你提供统一的类型定义（`src/types/index.ts`）和状态接口，所有其他 Agent 的组件须使用这些类型。修改类型前请通知所有下游 Agent。

---

## 二、核心目标与验收标准

| 目标 | 验收标准（Definition of Done） |
|------|-------------------------------|
| 1. 项目脚手架 | Vite + Vue 3 项目可正常 `npm run dev` 和 `npm run build`；目录结构符合文档规范 |
| 2. 全局状态管理 | Pinia store 设计完成，包含 `dataStore`（全局索引缓存）、`uiStore`（界面状态）
| 3. 路由与页面骨架 | 所有顶层路由可用（/timeline, /stage/:id, /album/:id, /map, /person/:id）；页面骨架（Navigation, Sidebar, MainArea）占位完成 |
| 4. API 数据层 | 封装 `src/api/` 目录，提供 `loadIndex()`, `getStage()`, `getAlbum()` 等数据获取函数；支持按需加载和内存缓存 |
| 5. 工具与共享组件 | 提供 `dateUtils.ts`、`typeGuards.ts`、`useScrollSync.ts` 等工具；提供 `BaseMap`（地图容器，不含业务数据）、`PhotoGrid`、`MarkdownRenderer` 等基础组件 |

---

## 三、输入与依赖

### 输入
- 根目录 `PMS_Photo_Memory_System_开发指导文档.md` 中「四、架构与路由设计」章节
- 主色调与视觉风格规范：黑色背景、火红/橙红高光、极简主义

### 外部依赖

| 接口方 | 接口内容 |
|--------|---------|
| **数据工程 Agent** | `public/data/index.json` 的数据结构需稳定后，你才能确定 TypeScript 类型 |
| **地图功能 Agent** | 需要你的 `BaseMap` 组件作为容器，承载 `Mapbox + deck.gl` 图层 |
| **各视图组件 Agent** | 需要你的状态管理和数据 API 来渲染内容 |

---

## 四、详细技术任务

### Task 2.1: 项目脚手架搭建
- 初始化 Vite + Vue 3 + TypeScript 项目
- 安装并配置：`pinia`, `vue-router@4`, `tailwindcss`（或你选择的 CSS 方案）
- 配置 `vite.config.ts` 的 alias：`@` → `./src`
- 创建目录结构：
  ```
  src/
    api/          # 数据获取层
    components/   # 共享组件
    composables/  # Vue 组合式函数
    router/       # 路由配置
    stores/       # Pinia 状态
    types/        # TypeScript 接口
    utils/        # 工具函数
    views/        # 页面级组件（由其他 Agent 实现，你创建骨架）
  ```

### Task 2.2: Pinia 全局状态设计
- `dataStore`: 存储 `index.json` 数据、当前加载的照片、缓存的远程数据
- `uiStore`: 存储当前主题、侧边栏展开状态、选中的阶段/相册、加载状态

### Task 2.3: 路由配置与页面骨架
- 配置 `vue-router`，包含路由：
  - `/` → 重定向到 `/timeline`
  - `/timeline` → TimelineView
  - `/stage/:id` → StageView
  - `/album/:id` → AlbumView
  - `/map` → MapView
  - `/person/:id` → PersonView
- 每个视图的 `.vue` 文件由其他 Agent 填充，你创建骨架框架

### Task 2.4: TypeScript 类型定义
- 在 `src/types/index.ts` 中统一定义：
  - `Stage`, `Album`, `Photo`, `Person`, `Place`
  - 请求响应类型（`ApiResponse<T>`）
  - UI 状态类型
- 类型定义需与数据工程 Agent 的 JSON Schema 对齐

### Task 2.5: 共享组件
- `LoadingScreen.vue`: 全屏加载动画（带返回首页的 N 秒超时处理）
- `BaseMap.vue`: 地图容器组件，接收 `layers` prop，由地图功能 Agent 填充逻辑
- `PhotoGrid.vue`: 照片瀑布流/网格容器，接收照片列表
- `MarkdownRenderer.vue`: 基于 `v-md-editor` 的 Markdown 渲染组件

---

## 五、预期产出

| 产出物 | 路径 |
|--------|------|
| 项目脚手架 | 根目录下完整的 Vue 3 项目 |
| 状态管理文件 | `src/stores/dataStore.ts`, `src/stores/uiStore.ts` |
| 路由配置 | `src/router/index.ts` |
| 类型定义 | `src/types/index.ts` |
| 数据 API 层 | `src/api/` |
| 基础共享组件 | `src/components/` |
| 工具函数 | `src/utils/`, `src/composables/` |

---

## 六、风险与挑战

| 风险 | 缓解措施 |
|------|---------|
| 数据接口不稳定 | 与数据工程 Agent 约定最小可用接口（MVP 版本），其余字段后续扩展 |
| 视图 Agent 依赖页面骨架 | 尽快完成骨架，使用占位内容（lorem ipsum）让下游 Agent 并行开发 |
| 状态管理接口变更影响大 | 所有状态变更通过 action 暴露，禁止外部直接修改 state；变更前发 RFC |

---

## 七、完成确认清单

- [x] `npm run dev` 正常运行，无报错
- [x] `npm run build` 产物完整
- [x] 所有路由可通过导航访问
- [x] 数据加载流程可用（使用 mock 数据验证）
- [x] TypeScript 类型无 `any` 遗漏
