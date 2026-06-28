# Task: 数据工程与解析引擎开发

**负责人**: Agent — 数据处理与解析引擎专家  
**优先级**: P0  
**预计工时**: 4-5 天  
**前置依赖**: 项目初始化和现有原始数据（照片、手账内容）

---

## 一、任务范围与边界

**负责内容**：
- 统一数据源整理与标准化
- 原始内容（照片/手账）的迁移、清洗与结构化处理
- 生成 `index.json` 数据索引文件
- Markdown 文档解析与格式化转换
- 图像与 EXIF 信息迁移整理

**不碰内容**：
- 前端 UI 开发（前端基础架构、各视图 Agent 负责）
- 地图渲染（地图功能 Agent 负责）
- 业务逻辑与状态管理（前端架构 Agent 如有关于作品内容）

> ⚠️ **跨 Agent 约定**：数据工程 Agent 的最终输出是 JSON 索引文件以及迁移整理后的资源文件，这些文件要保持稳定不变的接口约定。索引结构和字段变更可能影响前端所有 Agent。

## 二、核心目标与验收标准

| 目标 | 验收标准（Definition of Done） |
|------|-------------------------------|
| 1. 数据源统一 | 将散落在一加的原始数据、旧手机数据按规则整理进项目目录；原始数据完整保留 |
| 2. 索引文件生成 | `public/data/index.json` 结构正确，通过 JSON Schema 校验，能被前端所有 Agent 正确读取 |
| 3. Markdown 解析 | 旧笔记/手账内容正确解析为 Markdown，格式化规范正确，中文字符不乱码 |
| 4. 照片资源迁移 | 所有照片完整迁移至 `public/img/`，文件命名统一，分类清晰 |
| 5. EXIF 数据提取 | 照片基本元数据（时间、地理位置等）提取并存入对应数据源 |

## 三、输入与依赖指日

### 数据输入
- 一加原始数据源（需咨询刘少获取具体信息）
- 手账内容（旧笔记）
- 旧手机照片

### 依赖的外部信息
- `PMS_Photo_Memory_System_开发指导文档.md` 中「数据源整理与 Markdown 处理建议」
- 图片源数据标准字段与文件夹映射规则

## 四、详细技术任务

### Task 1.1: 数据源整理与映射
- 整理所有原始数据源：
  - 原始照片（旧手机、新手机等）
  - 文字内容（旧笔记、手账、社交媒体记录）
- 建立照片分类文件夹体系（按人或阶段）：
  - `public/img/` 目录下分类放置，命名统一
- 记录每个阶段、每个人的数据源说明，方便后续参考

### Task 1.2: 旧笔记转换为 Markdown
- 将手账内容转换为 Markdown 格式
- 写作规范遵循：
  - 标准 Markdown 语法（CommonMark 兼容）
  - 注重排版，尽量使用标题、列表、引用等结构
  - 保留原始情感表达与细节
- 图片文件名规范命名（如统一采用拼音或英文避免中文乱码）
- 生成的 Markdown 文件按阶段存放

### Task 1.3: 生成 index.json 索引文件
- 遍历所有阶段的 Markdown 文件、照片、人物、地点
- 按照约定的结构输出 `public/data/index.json`
- 包含字段：
  - `stages` 数组：各阶段的名称、时间、描述、文件路径、参与者
  - `albums` 数组：相册的基本信息、照片数量、展示缩略图
  - `people` 数组：相关人物的基本信息与关联的阶段
  - `places` 数组：地点名称、地理坐标（用于地图）
- 编写 JSON Schema 验证脚本，保证数据结构正确性与一致性
- 存储文件：`public/data/index.json`

### Task 1.4: 脚本化自动化处理
- 编写 Node.js/Python 脚本，自动完成如下重复劳动：
  - 照片迁移与重命名
  - Markdown 生成与格式化
  - index.json 自动生成
- 脚本具备幂等性，多次运行结果一致
- 脚本参数化，能方便指定输入输出路径
- 脚本位置：`scripts/data-process/` 目录（如 `scripts/relocate_photos.py`、`scripts/generate_index.py`）

## 五、预期产出

| 产出物 | 路径 |
|--------|------|
| 结构化数据索引 | `public/data/index.json` |
| Markdown 内容文件 | `public/data/stages/` 或 `public/data/stories/`（根据具体阶段） |
| 迁移后的照片资源 | `public/img/` 下按阶段/年份/类型分类 |
| 数据处理脚本 | `scripts/` 目录下的自动化脚本 |
| JSON Schema | `scripts/data-process/schema.json` 或类似文件 |

## 六、完成确认清单

- [x] 所有原始数据源整理完毕，不产生数据丢失 — 样本原始数据位于 `scripts/raw-data/`（13 张带 EXIF 照片 + 3 篇手账笔记），原始文件只读，脚本仅复制迁移
- [x] `public/data/index.json` 结构正确，JSON Schema 校验通过 — `scripts/data-process/schema.json` + `validate_index.js`，ajv 校验通过（stages=3 albums=1 people=4 places=4 photos=13）
- [x] 照片按阶段分类放置于 `public/img/` 目录中 — `public/img/{阶段slug}/`，统一命名 `{slug}-{NNN}.jpg`
- [x] Markdown 文件渲染正确，无乱码或格式错误 — `public/data/{stages,albums,people,places}/`，UTF-8 无 BOM，YAML front matter + CommonMark 正文
- [x] 自动化脚本可正常运行，index.json 可自动重生成 — `npm run pipeline` 端到端通过，幂等性已验证
- [x] 前端至少能通过 `dataStore` 正确读取索引数据并展示 — 前端已通过 `api/index.ts` 归一化层消费 index.json，dataStore 测试通过

---

## 七、交付说明（样本数据走通全流程）

由于真实原始数据（一加数据/旧手机照片/手账笔记）暂不可用，本次以**样本数据**完整走通数据流水线，验证脚本与契约的正确性。真实数据到位后无需改动脚本，只需：

1. 将原始照片按阶段放入 `scripts/raw-data/photos-raw/{阶段}/`；
2. 将手账笔记放入 `scripts/raw-data/notes-raw/{阶段}.txt`；
3. 在 `scripts/data-process/config.js` 的 `STAGES`/`PEOPLE`/`PLACES`/`ALBUMS` 中调整阶段、人物、地点清单；
4. 在 `scripts/` 目录执行 `npm run pipeline`。

### 产出物清单

| 产出物 | 路径 |
|--------|------|
| JSON Schema 契约 | `scripts/data-process/schema.json` |
| 共享配置（阶段/人物/地点/命名规则） | `scripts/data-process/config.js` |
| 照片迁移脚本 | `scripts/data-process/relocate_photos.js` |
| Markdown 格式化脚本 | `scripts/data-process/markdown_formatter.js` |
| 索引生成脚本 | `scripts/data-process/generate_index.js` |
| Schema 校验脚本 | `scripts/data-process/validate_index.js` |
| EXIF 提取脚本 | `scripts/data-process/extract_exif.py` |
| 缩略图生成脚本 | `scripts/data-process/make_thumbnails.py` |
| 数据索引 | `public/data/index.json` |
| Markdown 内容 | `public/data/{stages,albums,people,places}/` |
| 迁移后照片 + 缩略图 | `public/img/{阶段slug}/` + `public/img/{阶段slug}/thumbs/` |
| EXIF sidecar | `public/img/_meta/{基名}.json` |
| 数据源映射文档 | `scripts/raw-data/README.md` |
| 依赖清单 | `scripts/package.json`、`scripts/data-process/requirements.txt` |

### 关键契约约定

- **location 字段**：统一使用 `{ latitude, longitude, name }`（依据 `tasks/README.md` 3.2 节跨 Agent 数据约定）。
- **id 安全字符串**：`^[a-z0-9][a-z0-9_-]*$`，避免 URL 与文件系统编码问题。
- **照片 id**：由文件基名派生（如 `01-childhood-001`），稳定且幂等。
- **content 字段**：指向 Markdown 文件的 web 路径（如 `/data/stages/01-childhood.md`），供前端 MarkdownRenderer 按需加载。

### ⚠️ 跨 Agent 冲突待协调

发现并行的前端基础架构 Agent 向 `public/data/index.json` 写入了 mock 数据（4 阶段、`lat/lng` 字段、40 张照片引用 `/img/thumbs/`），覆盖了本 Agent 的权威输出。需协调：

1. **index.json 写入权**：按跨 Agent 契约，`public/data/index.json` 应由数据工程 Agent 独家产出，前端 Agent 应改为消费而非写入。
2. **location 字段命名**：前端 mock 使用 `lat/lng`（源于开发指导文档 4.3 节类型定义），本 Agent 采用 `latitude/longitude`（源于 README 3.2 节数据约定）。两者冲突，需统一为 `latitude/longitude` 并让前端类型对齐（前端任务文档 2.4 节明确要求「类型定义需与数据工程 Agent 的 JSON Schema 对齐」）。
