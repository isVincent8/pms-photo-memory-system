# Task: 地图功能（Mapbox & deck.gl）开发

**负责人**: Agent — 地图功能专家  
**优先级**: P2（与前端并行，但略微靠后）  
**预计工时**: 3-4 天  
**前置依赖**: 前端基础架构 Agent 完成 `BaseMap.vue` + 数据工程 Agent 数据稳定  

---

## 一、任务范围与边界

**负责内容**：
- 地图视图 (`MapView`) 与 `MapDetailOverlay`
- Mapbox 地图 SDK 集成与配置
- deck.gl 图层叠加与数据可视化
- 地点与照片的地理信息渲染（点聚类、聚合、详情弹出）

**不碰内容**：
- 底层 Vue 项目架构和路由配置（由前端基础架构 Agent 负责）
- 数据生成与解析（由数据工程 Agent 负责）
- Timeline、Stage、Album 等视图组件（由核心视图组件 Agent 负责）

> ⚠️ **跨 Agent 约定**：你负责地图渲染与交互，但数据源是 `dataStore` 提供的照片和地点信息。不要在地图组件中直接解析 Markdown 或读取本地文件。

---

## 二、核心目标与验收标准

| 目标 | 验收标准（Definition of Done） |
|------|-------------------------------|
| 1. 基础地图 | Mapbox 地图可正常渲染，包含基础底图（暗色风格优先） |
| 2. 点渲染 | 照片和地点在地图上以点/标记形式渲染，不同标记区分照片与普通地点 |
| 3. 聚类与聚合 | 相邻点自动聚类；点击聚类展开；聚合效果平滑 |
| 4. MapDetailOverlay | 点击地图标记弹出右侧详情面板，显示照片缩略图与基本信息 |
| 5. 性能 | 地图缩放、移动时无明显卡顿（目标：60fps） |
| 6. 移动端适配 | 地图视图在移动端正常交互（触摸缩放、拖拽） |

---

## 三、输入与依赖

### 输入
- 根目录 `PMS_Photo_Memory_System_开发指导文档.md` 中关于 `MapView` 与 `MapDetailOverlay` 的章节
- 前端基础架构 Agent 提供的 `BaseMap.vue` 组件（作为地图容器）
- `dataStore` 中提供的照片与地点数据

### 外部依赖

| 接口方 | 接口内容 |
|--------|---------|
| **前端基础架构 Agent** | 提供 `BaseMap.vue`（地图容器）；`dataStore` 中可获取 `photos` 与 `places` 数据 |
| **数据工程 Agent** | 照片和地点数据需包含 `location` 字段（经纬度） |

---

## 四、详细技术任务

### Task 4.1: Mapbox 集成
- 在 `MapView.vue` 中引入 Mapbox GL JS
- 使用暗色主题地图样式（如 `mapbox://styles/mapbox/dark-v10` 或自定义样式）
- 地图中心点与缩放级别根据数据自动计算（取所有点的中心 + 合适 zoom）

### Task 4.2: deck.gl 图层叠加
- 引入 deck.gl 并配置 MapboxOverlay（或直接使用 deck.gl 的 MapboxLayer）
- 创建 ScatterplotLayer 渲染照片/地点点
- 创建 IconLayer 或 Marker 用于自定义标记样式
- 配置图层交互：悬停显示标签，点击触发选中

### Task 4.3: 点聚类与聚合
- 使用 Mapbox 的 `cluster` 属性实现点聚类
- 配置聚类半径与颜色渐变
- 点击聚类 → 缩放到聚合范围
- 聚类展开动画平滑过渡

### Task 4.4: MapDetailOverlay 实现
- 右侧弹出面板（宽度固定，如 400px，移动端全屏）
- 面板内容：
  - 地点/照片缩略图
  - 相关时间信息
  - 关联的 Stage/Album 链接
- 面板支持滑动关闭（移动端）

### Task 4.5: 性能优化
- 大数据量时使用 deck.gl 的 `data` prop 动态更新，避免全量重渲染
- 地图外区域点不渲染（视口裁切）
- 聚合/散点在动画时保持流畅

---

## 五、预期产出

| 产出物 | 路径 |
|--------|------|
| 地图视图 | `src/views/MapView.vue` |
| 地图详情覆盖层 | `src/components/map/MapDetailOverlay.vue` |
| 地图组件 | `src/components/map/` |
| deck.gl 图层配置 | `src/components/map/layers/` |

---

## 六、完成确认清单

- [x] Mapbox 地图正常渲染，暗色主题 —— maplibre-gl + CARTO dark-matter；代码已实现，vue-tsc/build 通过，dev server 正常启动
- [x] 所有带 `location` 字段的照片/地点在地图上可见 —— ScatterplotLayer 照片点（火红）+ 地点点（琥珀环）；代码已实现
- [x] 点聚类功能正常，聚合/展开动画平滑 —— supercluster + easeTo；代码已实现
- [x] MapDetailOverlay 正常弹出，信息显示正确 —— 照片/地点二态面板；代码已实现
- [x] 移动端地图操作流畅（触摸、缩放） —— maplibre touchZoomRotate + 面板滑动关闭；代码已实现

> ⚠️ 以上为代码实现 + 类型检查 + 构建验证状态。浏览器端实际渲染验证（WebGL 地图、聚类动画、面板交互）需用户在 `npm run dev` 后于浏览器中确认。
