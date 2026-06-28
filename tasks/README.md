# PMS Photo Memory System — Agent 协作开发任务总览

> 📁 **根目录指导文档**：《PMS_Photo_Memory_System_开发指导文档.md》
>
> 本文档基于根目录指导文档，将开发任务拆分为不冲突的并行模块，分配给不同的 Agent 独立执行。

---

## 一、任务分工总览

| # | 任务文档 | 负责 Agent | 优先级 | 预计工时 | 状态 |
|---|---------|-----------|--------|---------|------|
| 1 | [task_frontend_architecture.md](task_frontend_architecture.md) | 前端基础架构 Agent | P0 | 3-4 天 | ✅ 已完成 |
| 2 | [task_data_engineering.md](task_data_engineering.md) | 数据工程 Agent | P0 | 2-3 天 | ✅ 已完成 |
| 3 | [task_view_components.md](task_view_components.md) | 核心视图组件 Agent | P1 | 4-5 天 | ✅ 已完成 |
| 4 | [task_map_feature.md](task_map_feature.md) | 地图功能 Agent | P2 | 3-4 天 | ✅ 已完成 |

---

## 二、开发顺序与依赖关系

```
第一阶段（并行，P0）：
├─ 前端基础架构 Agent ──> 产出基础 Vue 项目 + 路由 + Pinia Store + 公共组件 ✅
└─ 数据工程 Agent ───> 产出数据结构 + MarkDown解析器 + 数据服务 ✅

第二阶段（依赖第一阶段，P1）：
└─ 核心视图组件 Agent ──> 产出 TimelineView / StageView / AlbumView + 详情与动效 ✅

第三阶段（依赖第一、二阶段，P2）：
└─ 地图功能 Agent ──> 产出 MapView + deck.gl 图层 + 聚类 + MapDetailOverlay ✅
```

> 💡 **关键约定**：所有 Agent 的数据来源统一为 `dataStore`。

---

## 三、协作规范

### 3.1 代码约定
- 所有组件使用 Vue 3 Composition API
- 样式使用 Tailwind CSS，主题色由 `frontend_architecture` Agent 统一配置
- 组件目录按功能分：`src/components/{timeline,stage,album,map}`

### 3.2 数据约定
- 照片和地点数据通过 `dataStore` 获取，**禁止直接解析 Markdown 或读取本地文件**
- 所有 ID 使用安全字符串（`^[a-z0-9][a-z0-9_-]*$`）
- `location` 字段格式：**`{ latitude, longitude, name? }`**（已统一，详见下方决策记录）
- `public/data/index.json` **写入权归数据工程 Agent**，前端 Agent 只读消费

### 3.3 跨 Agent 接口

| 接口 | 提供方 | 使用方 | 说明 |
|------|--------|--------|------|
| `BaseMap.vue` | 前端基础架构 Agent | 地图功能 Agent | 地图容器组件 |
| `PhotoDetailPanel.vue` | 核心视图组件 Agent | 地图功能 Agent | 照片详情弹出面板 |
| `dataStore.photos` | 数据工程 Agent | 所有其他 Agent | 照片数据集合 |
| `dataStore.places` | 数据工程 Agent | 地图功能 Agent | 地点数据集合 |
| `MarkdownRenderer` | 前端基础架构 Agent | 核心视图组件 Agent | Markdown 渲染组件（基于 @kangc/v-md-editor） |

### 3.4 文件所有权矩阵

> 跨 Agent 并行开发时，明确文件所有权可避免写入冲突。

| 文件/目录 | 所有者 | 其他人权限 |
|-----------|--------|-----------|
| `public/data/index.json` | **数据工程 Agent** | 只读 |
| `scripts/data-process/*` | 数据工程 Agent | 只读 |
| `src/types/index.ts` | 前端基础架构 Agent | 只读 |
| `src/stores/dataStore.ts` | 前端基础架构 Agent | 只读 |
| `src/api/index.ts` | 前端基础架构 Agent | 只读 |
| `src/components/map/**` | 地图功能 Agent | 只读 |
| `src/views/*.vue` | 核心视图组件 Agent | 只读 |
| `tailwind.config.js` | 共享（需协商） | 可追加，勿删除他人扩展 |
| `src/style.css` | 共享（需协商） | 可追加，勿删除他人扩展 |

---

## 四、已解决的跨 Agent 冲突

### 决策 1：location 字段命名 → `latitude/longitude`

- **冲突**：README 3.2 节要求 `{ latitude, longitude }`，指导文档 4.3 节定义 `{ lat, lng, name }`
- **决策**：统一使用 **`{ latitude, longitude, name? }`**，与 `schema.json` 的 `geoLocation` 定义一致
- **执行**：`api/index.ts` 的 `normalizeLocation()` 兼容两种格式输入，输出统一为 `latitude/longitude`
- **影响范围**：types、index.json、MapView、dataStore

### 决策 2：index.json 写入权 → 数据工程 Agent 独占

- **冲突**：前端基础架构 Agent 曾写入 mock 数据覆盖数据工程 Agent 的权威输出
- **决策**：`public/data/index.json` 的唯一写入者是数据工程 Agent（或其脚本 `scripts/data-process/generate_index.js`）
- **执行**：已删除前端的 `scripts/gen-index.mjs`、`gen-photos.mjs`、`gen-thumbs.mjs` 三个 mock 生成器及 `public/img/{photos,stages,thumbs}/` 三个 mock SVG 目录；前端通过 `api/index.ts` 归一化层只读消费

### 决策 3：Person/Album 字段名统一

- `Person.stages` → `Person.stageIds`（与 schema 对齐）
- `Album.stage` → `Album.stageId`（与 schema 对齐）
- `Album.location: string` → `Album.location: GeoLocation`（与 schema 对齐）
- `Album.photoCount` → `Album.photoIds[]`（与 schema 对齐）
- `Place.description` → `Place.content`（与 schema 对齐）

---

## 五、快速开始

每位 Agent 请先阅读：
1. 根目录 `PMS_Photo_Memory_System_开发指导文档.md` — 了解项目全貌
2. 本目录下对应任务文档 — 了解具体职责和验收标准
3. 查看当前已完成的依赖产出（如有）

---

## 六、任务状态追踪

| Agent | 任务 | 当前状态 | 备注 |
|-------|------|---------|------|
| 前端基础架构 | `task_frontend_architecture.md` | ✅ 已完成 | 脚手架 + 类型 + Store + 路由 + 共享组件 |
| 数据工程 | `task_data_engineering.md` | ✅ 已完成 | schema + 脚本 + mock 数据；真实数据待提供 |
| 核心视图组件 | `task_view_components.md` | ✅ 已完成 | Timeline/Stage/Album/Person + Lightbox + PhotoCard |
| 地图功能 | `task_map_feature.md` | ✅ 已完成 | MapView + maplibre + deck.gl + supercluster |

---

## 七、待办事项（人工）

- [ ] 联系「刘少」获取一加原始数据
- [ ] 提供旧手机照片与手账笔记
- [ ] 运行 `cd scripts && npm run pipeline` 生成正式 index.json
- [ ] 浏览器端实测所有视图（Timeline 切换 + Stage 渲染 + Album Lightbox + Map 交互）
- [ ] 确认 Mapbox/Carto 访问令牌无需后端代理

---

> 📝 **文档维护**：当某个任务完成后，在对应任务文档底部勾选完成确认清单，并在本 README 中更新状态。
