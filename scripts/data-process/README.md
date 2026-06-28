# PMS 数据处理脚本

数据工程流水线：原始照片 + 手账笔记 → 迁移重命名 → EXIF 提取 → 缩略图 → Markdown 格式化 → 索引生成 → Schema 校验。

## 快速运行

```bash
cd scripts
npm install              # 首次：安装 Node 依赖（ajv, gray-matter）
pip install -r data-process/requirements.txt   # 首次：安装 Python 依赖（Pillow, piexif）

npm run pipeline         # 端到端执行全部步骤
# 或单独执行：
npm run relocate         # 照片迁移重命名
npm run exif             # EXIF 提取
npm run thumbs           # 缩略图生成
npm run format-md        # Markdown 格式化
npm run gen-index        # 生成 index.json
npm run validate         # Schema 校验
```

## 架构

```
config.js          单一事实源：阶段/人物/地点/相册清单 + 命名规则 + 路径
utils.js           共享工具：目录遍历、JSON 读写、文件复制（仅依赖 Node 内置模块）
schema.json        index.json 的 JSON Schema 契约（所有前端 Agent 的接口基准）
relocate_photos.js Node  照片迁移：raw → public/img/{slug}/{slug}-{NNN}.jpg
extract_exif.py    Python EXIF 提取：→ public/img/_meta/{基名}.json
make_thumbnails.py Python 缩略图：→ public/img/{slug}/thumbs/{基名}.jpg
markdown_formatter.js Node 手账笔记 → CommonMark + YAML front matter
generate_index.js  Node  扫描 MD + 照片 + sidecar → public/data/index.json
validate_index.js  Node  ajv 校验 index.json 是否符合 schema.json
```

## 参数化

脚本不使用命令行参数，所有配置集中在 `config.js`：
- 新增/修改阶段、人物、地点、相册 → 编辑 `STAGES`/`PEOPLE`/`PLACES`/`ALBUMS`；
- 原始数据放入 `scripts/raw-data/`（结构见 `scripts/raw-data/README.md`）；
- 重跑 `npm run pipeline` 即可重新生成索引。

## 幂等性

所有脚本设计为幂等：相同输入多次运行产出一致（`index.json` 仅 `generatedAt` 变化）。照片按原始文件名排序后固定分配序号；目标同名覆盖；原始数据只读不修改。

## 契约要点

- `location` 统一为 `{ latitude, longitude, name }`；
- 所有 `id` 为安全字符串 `^[a-z0-9][a-z0-9_-]*$`；
- `content` 字段为 Markdown 文件的 web 路径，供前端按需加载；
- 修改 `schema.json` 字段后需同步通知所有前端 Agent（接口变更影响面大）。
