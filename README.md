# PMS — Photo Memory System（地图视图）

个人/家庭照片回忆系统的前端，本仓库当前聚焦 **地图视图**（MapLibre + deck.gl）。

## 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:5173 → 自动跳转 /map
```

无需任何 token —— 底图使用免费的 CARTO dark-matter（通过 maplibre-gl 渲染）。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅类型检查 |

## 目录约定

- `src/views/MapView.vue` — 地图视图入口
- `src/components/map/` — 地图功能组件、deck.gl 图层、聚类组合式
- `src/components/BaseMap.vue` — maplibre 地图容器（归属前端架构 Agent）
- `src/stores/` — Pinia 状态（dataStore / uiStore）
- `public/data/index.json` — mock 数据索引
- `public/img/thumbs/` — mock 照片缩略图

## 技术栈

Vite + Vue 3 + TypeScript + Pinia + Vue Router + Tailwind CSS + maplibre-gl + deck.gl + supercluster。

## Google Drive 云端同步

本项目参考 [My Insurance](../My%20Insurance) 的同步架构，提供基于 Google Drive 的数据同步能力：

- 后端位于 `pms-cloud/`（Next.js 16 + TypeScript）
- 使用 Google OAuth 2.0 offline 授权，服务端保存 refresh_token
- session 使用 jose 加密 JWT cookie
- access_token 过期时自动刷新
- 支持多文件同步：`index.json`（照片索引数据）、`settings.json`（用户设置）
- Drive 文件夹路径可配置，默认 `PMS/Data`，缺失目录自动创建

### 本地联调

1. 先启动 pms-cloud：

```bash
cd pms-cloud
npm install
cp .env.example .env.local
# 填写 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、SESSION_SECRET
npm run dev        # http://localhost:3000
```

2. 再启动 PMS 前端：

```bash
cd ..
npm install
npm run dev        # http://localhost:5173
```

Vite 开发服务器已配置代理，将 `/api/*` 转发到 `http://localhost:3000`，因此前后端共享 cookie。

### 生产部署

PMS 前端是静态站点，可部署到任意静态托管服务；pms-cloud 可部署到 Vercel 等 Node 平台。

生产环境需要在构建时指定后端地址：

```bash
VITE_API_BASE_URL=https://your-pms-cloud.vercel.app npm run build
```

或在 `.env` / `.env.local` 中设置：

```env
VITE_API_BASE_URL=https://your-pms-cloud.vercel.app
```

### 同步入口

打开 PMS 设置页（`/settings`），在“Google Drive 同步”区域登录后即可：

- **推送到 Drive**：把当前本地导入的 index.json 和设置上传到 Google Drive
- **从 Drive 拉取**：把 Drive 上的数据下载并覆盖到本地

云端数据仅保存在用户自己的 Google Drive，服务端不保留任何用户数据。
