# PMS (Photo Memory System) — 项目介绍与开发指导文档

---

## 一、项目概述

**项目名称**：PMS (Photo Memory System)  
**定位**：基于 Web 的个人/家庭照片回忆系统，以"人生阶段"为核心叙事线索，底层采用 Markdown 驱动内容组织，前端提供多种视图格式与交互方式。

**核心愿景**：将散落在硬盘与云盘中的照片，按照"人生阶段"重新编织成可阅读、可回顾、可分享的生命叙事。

---

## 二、核心功能定义

### 2.1 多人生阶段回顾（Life Stage Timeline）

这是系统的灵魂功能。用户的人生被划分为若干**阶段**（Stage），每个阶段是一段有明确主题的时间区间。

**阶段类型示例**：
- 童年期、小学、初中、高中、大学
- 第一份工作、创业期、育儿期
- 自定义阶段（如"环球旅行 2023-2024"）

**每个阶段包含**：
- 阶段元信息：名称、起止时间、封面图、主题色、描述
- 照片集：按时间轴或相册组织
- 阶段故事：Markdown 撰写的文字回忆
- 关联人物：该阶段中的重要他人
- 地理位置：阶段主要活动地点

**交互形式**：
- **纵向时间轴**：瀑布流或垂直时间轴，阶段为锚点
- **横向卷轴**：横向滑动浏览人生全景
- **阶段详情页**：进入单个阶段后的沉浸式浏览

### 2.2 多格式视图（Multi-Format Layout）

同一份照片数据，支持多种前端呈现格式，用户可自由切换：

| 视图模式 | 适用场景 | 技术要点 |
|---------|---------|---------|
| **时间轴视图** | 按拍摄时间线性浏览 | 垂直时间轴，支持缩略图+日期 |
| **相册网格** | 快速浏览大量照片 | Masonry 瀑布流，支持筛选 |
| **幻灯片/故事模式** | 沉浸式单张浏览 | 全屏遮罩，键盘导航，配文字 |
| **地图视图** | 按地理位置回顾 | 集成地图组件，照片聚类 |
| **人物视图** | 以人物为中心聚合 | 人脸识别标签（可选），人物时间线 |
| **阶段总览** | 人生阶段一览 | 卡片式或树状图，进度感 |

### 2.3 Markdown 底层架构

系统底层数据以 Markdown 文件为核心组织单元，确保：
- **可读性**：即使系统不再维护，文件本身仍可阅读
- **可迁移**：易于导出、迁移、版本控制（Git）
- **可扩展**：YAML Front Matter 承载结构化数据，正文承载叙事内容

---

## 三、数据模型设计（Markdown 方案）

### 3.1 文件目录结构

```
pms-data/
├── stages/                    # 人生阶段定义
│   ├── 01-childhood.md
│   ├── 02-high-school.md
│   └── 03-university.md
├── albums/                    # 照片集（按阶段或主题）
│   ├── 2020-summer-trip/
│   │   ├── index.md           # 相册元信息
│   │   ├── IMG_001.jpg
│   │   └── IMG_002.jpg
│   └── 2021-family/
│       ├── index.md
│       └── ...
├── people/                    # 人物档案
│   ├── alice.md
│   └── bob.md
├── places/                    # 地点档案
│   └── beijing.md
└── config.yaml                # 全局配置
```

### 3.2 阶段文件规范（stages/*.md）

```markdown
---
id: "university-2015-2019"
name: "大学四年"
type: "education"           # education / career / travel / family / custom
start_date: "2015-09-01"
end_date: "2019-06-30"
cover: "../albums/graduation/cover.jpg"
theme_color: "#4A90D9"
location: ["武汉", "长沙"]
people: ["alice", "bob"]
tags: ["青春", "友谊", "成长"]
---

# 大学四年

这是我人生中最自由的四年。

## 关键回忆

- **2016 年春天**：樱花季的东湖骑行
- **2017 年暑假**：第一次实习

## 照片精选

![军训](../albums/2015-military/IMG_001.jpg)
![毕业照](../albums/graduation/IMG_100.jpg)
```

### 3.3 相册索引规范（albums/*/index.md）

```markdown
---
title: "2020 夏日海岛行"
date: "2020-08-15"
location: "三亚"
stage: "travel-2020"
people: ["alice", "me"]
cover: "IMG_001.jpg"
---

一次说走就走的旅行。
```

### 3.4 全局配置（config.yaml）

```yaml
site:
  title: "我的时光纪"
  author: "张三"
  description: "记录生命中的重要时刻"

timeline:
  default_view: "vertical"   # vertical / horizontal / grid
  date_format: "YYYY-MM-DD"

stages:
  order: "chronological"     # chronological / custom
  show_empty: false

features:
  map_view: true
  people_view: true
  slideshow: true
  markdown_editor: true
```

---

## 四、前端技术架构建议

### 4.1 技术栈选型

| 层级 | 推荐方案 | 说明 |
|-----|---------|------|
| 框架 | **React 18+** / Vue 3 | 组件化开发，生态成熟 |
| 构建 | Vite | 快速冷启动，MD 插件生态 |
| 样式 | Tailwind CSS + CSS Variables | 主题色动态切换 |
| 路由 | React Router / Vue Router | 阶段页、相册页、单张照片页 |
| 状态 | Zustand / Pinia | 轻量状态管理 |
| MD 解析 | gray-matter + remark/rehype | 解析 YAML Front Matter 与正文 |
| 图片 | 懒加载 + 缩略图生成 | 大量照片性能优化 |
| 地图 | Leaflet / Mapbox GL JS | 开源，可离线 |
| 部署 | GitHub Pages / Vercel / 静态托管 | 纯前端，可静态部署 |

### 4.2 核心组件结构

```
src/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx          # 阶段导航侧边栏
│   │   ├── Header.tsx           # 顶部工具栏（视图切换）
│   │   └── ThemeProvider.tsx    # 主题色上下文
│   ├── Timeline/
│   │   ├── VerticalTimeline.tsx # 纵向时间轴
│   │   ├── HorizontalScroll.tsx # 横向卷轴
│   │   └── StageNode.tsx        # 阶段节点卡片
│   ├── Gallery/
│   │   ├── MasonryGrid.tsx      # 瀑布流
│   │   ├── AlbumGrid.tsx        # 相册网格
│   │   ├── Lightbox.tsx         # 灯箱/幻灯片
│   │   └── PhotoCard.tsx        # 单张照片卡片
│   ├── Stage/
│   │   ├── StageHeader.tsx      # 阶段封面与元信息
│   │   ├── StageStory.tsx       # Markdown 渲染
│   │   └── StagePhotoStrip.tsx  # 阶段内照片时间轴
│   ├── Map/
│   │   └── PhotoMap.tsx         # 地图聚类
│   └── Settings/
│       ├── ViewSwitcher.tsx     # 视图切换器
│       └── ThemeEditor.tsx      # 主题/阶段色编辑器
├── hooks/
│   ├── useMarkdownData.ts       # 加载并解析 MD 数据
│   ├── usePhotos.ts             # 照片数据与筛选
│   └── useStageConfig.ts        # 阶段配置管理
├── utils/
│   ├── markdownParser.ts        # MD 解析封装
│   ├── photoMetaExtractor.ts    # EXIF 信息提取（可选）
│   └── thumbnailGenerator.ts    # 缩略图生成（Web Worker）
└── types/
    └── index.ts                 # TypeScript 类型定义
```

### 4.3 关键类型定义

```typescript
// types/index.ts

interface Stage {
  id: string;
  name: string;
  type: 'education' | 'career' | 'travel' | 'family' | 'custom';
  startDate: string;
  endDate: string;
  cover?: string;
  themeColor: string;
  locations: string[];
  people: string[];
  tags: string[];
  content: string;           // Markdown HTML
  photos: Photo[];
}

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  caption?: string;
  date?: string;
  location?: GeoLocation;
  people?: string[];
  stageId?: string;
  albumId?: string;
}

interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
}

type ViewMode = 'timeline' | 'grid' | 'masonry' | 'slideshow' | 'map' | 'people';
```

### 4.4 数据流设计

```
Markdown 文件
    ↓
构建时：Vite 插件 / 脚本 扫描并解析
    ↓
生成 JSON 数据索引 (public/data/index.json)
    ↓
运行时：前端 fetch 索引 + 按需加载阶段 MD
    ↓
gray-matter 解析 → Stage 对象数组
    ↓
React Context / Zustand Store
    ↓
各视图组件消费数据
```

**构建时优化**：
- 编写 Vite 插件或 Node 脚本，在构建阶段扫描 stages/ 和 albums/，生成聚合索引
- 提取照片 EXIF 信息（拍摄时间、GPS），写入索引，避免运行时解析大文件
- 生成多尺寸缩略图（可用 Sharp 库）

---

## 五、开发路线图（第一阶段）

### Phase 1：基础框架（Week 1-2）
- [ ] 项目脚手架搭建（Vite + React/Vue + Tailwind）
- [ ] Markdown 解析流水线（gray-matter + remark）
- [ ] 目录扫描与数据索引生成脚本
- [ ] 基础布局：侧边栏阶段导航 + 主内容区

### Phase 2：核心视图（Week 3-4）
- [ ] 纵向时间轴视图（阶段为节点，可展开）
- [ ] 阶段详情页（封面 + Markdown 渲染 + 照片列表）
- [ ] 相册网格视图（瀑布流）
- [ ] 灯箱/幻灯片浏览（键盘左右切换）

### Phase 3：多格式与设定（Week 5-6）
- [ ] 视图切换器（时间轴 / 网格 / 幻灯片）
- [ ] 全局设定面板（主题色、默认视图、日期格式）
- [ ] 阶段设定编辑器（可在线调整阶段信息，导出为 MD）
- [ ] 响应式适配（移动端时间轴优化）

### Phase 4：增强体验（Week 7-8）
- [ ] 地图视图（照片 GPS 聚类）
- [ ] 人物视图（按人物聚合照片）
- [ ] 搜索与筛选（按时间、地点、人物、标签）
- [ ] 性能优化（虚拟滚动、图片懒加载、缩略图）

---

## 六、扩展性预留（未来阶段）

| 功能 | 说明 |
|-----|------|
| **服务端同步** | 接入云存储（OSS/S3），支持多端同步 |
| **AI 辅助** | 自动照片分类、场景识别、人脸识别打标签 |
| **协作分享** | 家庭共享空间，多人共同编辑回忆 |
| **导出出版** | 一键生成 PDF 相册 / 实体书排版文件 |
| **语音/视频** | 支持视频片段与语音备忘录嵌入 |

---

## 七、快速启动模板建议

如果你希望立即开始，建议按以下步骤初始化：

1. **创建项目**：
   ```bash
   npm create vite@latest pms -- --template react-ts
   cd pms
   npm install
   ```

2. **安装核心依赖**：
   ```bash
   npm install gray-matter remark rehype rehype-react react-markdown
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **创建数据目录**：
   ```bash
   mkdir -p public/data/stages public/data/albums
   ```

4. **编写数据扫描脚本**（scripts/build-index.js），在 npm run build 前执行

5. **启动开发**：
   ```bash
   npm run dev
   ```

---

## 八、总结

PMS 的核心设计哲学是：**用 Markdown 的简洁承载回忆的厚重，用 Web 的灵活呈现生命的脉络**。

第一阶段的重点不是功能的堆砌，而是建立一套**以"人生阶段"为纲、以 Markdown 为体、以多格式视图为用**的稳固架构。后续所有功能（AI、协作、出版）都将在这个骨架上自然生长。
