# 原始数据源映射说明

> 本文档记录 PMS 各阶段、人物、地点的原始数据来源与迁移规则。
> 真实数据到位后，将原始文件按下方结构放入对应目录，重跑 `npm run pipeline` 即可生成正式索引。
> 当前目录下为**样本数据**，用于走通全流程并验证脚本幂等性。

---

## 一、目录结构

```
scripts/raw-data/
├── photos-raw/          # 原始照片（按阶段/主题子目录存放，文件名可含中文/乱序）
│   ├── childhood/
│   ├── university/
│   ├── first-job/
│   └── travel-sanya/
├── notes-raw/           # 原始手账笔记（纯文本或不规则 Markdown）
│   ├── childhood.txt
│   ├── university.txt
│   └── first-job.txt
└── README.md            # 本文件
```

## 二、阶段 → 原始数据映射

| 阶段 id | 名称 | 时间 | 原始照片目录 | 原始笔记文件 | 迁移目标 |
|---------|------|------|-------------|-------------|---------|
| `childhood-1998-2010` | 童年时光 | 1998-2010 | `photos-raw/childhood/` | `notes-raw/childhood.txt` | `public/img/01-childhood/` + `public/data/stages/01-childhood.md` |
| `university-2015-2019` | 大学四年 | 2015-2019 | `photos-raw/university/` | `notes-raw/university.txt` | `public/img/02-university/` + `public/data/stages/02-university.md` |
| `first-job-2020-2022` | 初入职场 | 2020-2022 | `photos-raw/first-job/` | `notes-raw/first-job.txt` | `public/img/03-first-job/` + `public/data/stages/03-first-job.md` |

相册（跨阶段主题）：

| 相册 id | 标题 | 原始照片目录 | 迁移目标 |
|---------|------|-------------|---------|
| `2020-summer-sanya` | 2020 夏日海岛行 | `photos-raw/travel-sanya/` | `public/img/2020-summer-sanya/` |

## 三、命名规范

- **照片重命名**：`{阶段slug}-{3位序号}.{ext}`，例如 `01-childhood-001.jpg`。
  - 扩展名统一小写；中文文件名一律替换为英文 slug，避免 URL/文件系统编码问题。
  - 序号按原始文件名排序后固定分配，保证多次运行（幂等）结果一致。
- **Markdown 文件**：`{阶段slug}.md`，例如 `02-university.md`。
- **EXIF sidecar**：`public/img/_meta/{照片基名}.json`，由 `extract_exif.py` 生成。
- **缩略图**：`public/img/{阶段slug}/thumbs/{照片基名}.jpg`，由 `make_thumbnails.py` 生成。

## 四、真实数据接入步骤

1. 从一加手机导出照片（联系刘少获取），按阶段放入 `photos-raw/{阶段}/`。
2. 将旧手机照片、手账笔记按对应阶段放入 `notes-raw/` 与 `photos-raw/`。
3. 如需新增/调整阶段、人物、地点，编辑 `scripts/data-process/config.js` 中的 `STAGES`/`PEOPLE`/`PLACES`/`ALBUMS`。
4. 在 `scripts/` 目录执行 `npm run pipeline`，自动完成：迁移照片 → 提取 EXIF → 生成缩略图 → 格式化 Markdown → 生成 index.json → Schema 校验。
5. 校验通过后，前端 Agent 即可从 `public/data/index.json` 读取数据。

## 五、数据完整性约定

- 原始数据 (`scripts/raw-data/`) **只读**，脚本不修改原始文件，仅复制到 `public/img/`。
- 迁移前不删除已有产物；如需清理，手动删除 `public/img/{阶段}/` 与 `public/data/index.json` 后重跑。
- `relocate_photos.js` 默认覆盖同名目标文件（保证幂等），但保留原始文件不变。
