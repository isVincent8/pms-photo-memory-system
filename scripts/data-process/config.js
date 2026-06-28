// PMS 数据工程共享配置
// 所有 Node 脚本从此文件读取路径、阶段清单与命名规则，确保一致性与幂等性。
// 修改阶段/人物/地点清单只需改本文件，重跑 pipeline 即可重新生成索引。

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录：scripts/data-process/ -> 上两级
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// 核心目录（相对项目根）
export const DIRS = {
  projectRoot: PROJECT_ROOT,
  public: path.join(PROJECT_ROOT, 'public'),
  dataDir: path.join(PROJECT_ROOT, 'public', 'data'),
  stagesDir: path.join(PROJECT_ROOT, 'public', 'data', 'stages'),
  albumsDir: path.join(PROJECT_ROOT, 'public', 'data', 'albums'),
  peopleDir: path.join(PROJECT_ROOT, 'public', 'data', 'people'),
  placesDir: path.join(PROJECT_ROOT, 'public', 'data', 'places'),
  imgDir: path.join(PROJECT_ROOT, 'public', 'img'),
  indexFile: path.join(PROJECT_ROOT, 'public', 'data', 'index.json'),
  schemaFile: path.join(__dirname, 'schema.json'),
  // 原始数据输入
  rawRoot: path.join(PROJECT_ROOT, 'scripts', 'raw-data'),
  rawPhotos: path.join(PROJECT_ROOT, 'scripts', 'raw-data', 'photos-raw'),
  rawNotes: path.join(PROJECT_ROOT, 'scripts', 'raw-data', 'notes-raw'),
  // EXIF sidecar 输出目录（与照片同级的 _meta）
  exifDir: path.join(PROJECT_ROOT, 'public', 'img', '_meta'),
};

// 站点元信息（写入 index.json.site）
export const SITE = {
  title: '我的时光纪',
  author: '张三',
  description: '记录生命中的重要时刻',
};

// 索引结构版本号（语义化）。字段不兼容变更时递增主版本。
export const INDEX_VERSION = '1.0.0';

// 阶段清单 —— 驱动整条流水线。
// rawPhotoGlob: 原始照片匹配模式（相对 DIRS.rawPhotos），用于 relocate_photos。
// rawNoteFile: 该阶段的原始手账笔记文件（相对 DIRS.rawNotes），用于 markdown_formatter。
// 命名约定：id 为安全字符串；slug 用于生成照片目录名与文件名前缀。
export const STAGES = [
  {
    id: 'childhood-1998-2010',
    name: '童年时光',
    type: 'education',
    startDate: '1998-01-01',
    endDate: '2010-06-30',
    themeColor: '#F2A65A',
    locations: ['北京'],
    people: ['mom', 'dad'],
    tags: ['成长', '家庭'],
    description: '在北京度过的童年，胡同里的夏天与冰糖葫芦。',
    slug: '01-childhood',
    rawPhotoGlob: 'childhood/**/*.{jpg,jpeg,JPG,JPEG,png,PNG}',
    rawNoteFile: 'childhood.txt',
  },
  {
    id: 'university-2015-2019',
    name: '大学四年',
    type: 'education',
    startDate: '2015-09-01',
    endDate: '2019-06-30',
    themeColor: '#4A90D9',
    locations: ['武汉'],
    people: ['alice', 'mom'],
    tags: ['青春', '友谊', '成长'],
    description: '武汉的大学四年，东湖骑行与樱花季。',
    slug: '02-university',
    rawPhotoGlob: 'university/**/*.{jpg,jpeg,JPG,JPEG,png,PNG}',
    rawNoteFile: 'university.txt',
  },
  {
    id: 'first-job-2020-2022',
    name: '初入职场',
    type: 'career',
    startDate: '2020-07-01',
    endDate: '2022-12-31',
    themeColor: '#E0564D',
    locations: ['深圳'],
    people: ['bob'],
    tags: ['职场', '独立'],
    description: '深圳的第一份工作，从生涩到独当一面。',
    slug: '03-first-job',
    rawPhotoGlob: 'first-job/**/*.{jpg,jpeg,JPG,JPEG,png,PNG}',
    rawNoteFile: 'first-job.txt',
  },
];

// 人物档案清单（id 为安全字符串）
export const PEOPLE = [
  { id: 'mom', name: '妈妈', bio: '最温暖的后盾。' },
  { id: 'dad', name: '爸爸', bio: '沉默而坚定的依靠。' },
  { id: 'alice', name: 'Alice', bio: '大学室友，四年形影不离。' },
  { id: 'bob', name: 'Bob', bio: '第一份工作的前辈与好友。' },
];

// 地点档案清单（含经纬度，供地图视图使用）
export const PLACES = [
  { id: 'beijing', name: '北京', latitude: 39.9042, longitude: 116.4074 },
  { id: 'wuhan', name: '武汉', latitude: 30.5928, longitude: 114.3055 },
  { id: 'shenzhen', name: '深圳', latitude: 22.5431, longitude: 114.0579 },
  { id: 'sanya', name: '三亚', latitude: 18.2528, longitude: 109.5119 },
];

// 相册清单（可关联阶段与地点）
export const ALBUMS = [
  {
    id: '2020-summer-sanya',
    title: '2020 夏日海岛行',
    date: '2020-08-15',
    stageId: 'first-job-2020-2022',
    placeId: 'sanya',
    people: ['alice'],
    description: '一次说走就走的旅行，第一次看到那么蓝的海。',
    rawPhotoGlob: 'travel-sanya/**/*.{jpg,jpeg,JPG,JPEG,png,PNG}',
    slug: '2020-summer-sanya',
  },
];

// 图片扩展名集合
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// 将任意字符串转为安全 slug：小写、仅保留 a-z0-9、其余转 -、去首尾 -。
// 中文等非 ASCII 字符按音序不便自动处理时，调用方应直接传入英文 slug。
export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 生成照片在 public/img/{stageSlug}/ 下的目标文件名：{stageSlug}-{序号}.{ext}
// 序号固定 3 位，保证幂等与稳定排序。
export function photoTargetName(stageSlug, index, ext) {
  const safeExt = ext.toLowerCase().replace(/^\.+/, '');
  return `${stageSlug}-${String(index).padStart(3, '0')}.${safeExt}`;
}

// 将文件系统绝对路径转为 web 根相对路径（以 / 开头），用于 index.json 中的 src/thumbnail/content。
export function toWebPath(absPath) {
  const rel = path.relative(DIRS.public, absPath);
  return '/' + rel.split(path.sep).join('/');
}
