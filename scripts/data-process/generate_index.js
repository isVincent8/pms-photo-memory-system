// index.json 索引生成脚本（Task 1.3 + 1.4）
// 遍历 public/data/{stages,albums,people,places}/ 下的 Markdown，解析 YAML front matter；
// 扫描 public/img/{slug}/ 下的照片，读取 _meta/{基名}.json sidecar（EXIF）；
// 交叉关联阶段/相册/人物/地点/照片，输出 public/data/index.json（结构符合 schema.json）。
// 幂等：纯函数式扫描 + 固定排序，多次运行结果一致（generatedAt 除外）。
//
// 用法：node data-process/generate_index.js

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DIRS, SITE, INDEX_VERSION, PLACES, toWebPath } from './config.js';
import { walkImages, readJSON, writeJSON, basename } from './utils.js';

/** 读取某目录下所有 .md 文件的 front matter（含 content 路径），按文件名排序。 */
function readMarkdownDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const file = path.join(dir, f);
      const parsed = matter(fs.readFileSync(file, 'utf8'));
      return { file, data: parsed.data, contentWebPath: toWebPath(file) };
    });
}

/** 读取照片的 EXIF sidecar；不存在则返回空对象。 */
function readExifSidecar(photoPath) {
  const base = basename(photoPath);
  const sidecar = path.join(DIRS.exifDir, `${base}.json`);
  if (!fs.existsSync(sidecar)) return {};
  try {
    return readJSON(sidecar);
  } catch {
    return {};
  }
}

/** 构造单张照片对象。locationName 用于填充 location.name。 */
function buildPhoto(photoPath, stageId, albumId, locationName) {
  const base = basename(photoPath);
  const exif = readExifSidecar(photoPath);
  const thumbPath = path.join(path.dirname(photoPath), 'thumbs', `${base}.jpg`);
  const photo = {
    id: base,
    src: toWebPath(photoPath),
    thumbnail: fs.existsSync(thumbPath) ? toWebPath(thumbPath) : toWebPath(photoPath),
    caption: '',
    date: exif.date ?? null,
    stageId: stageId ?? undefined,
    albumId: albumId ?? undefined,
  };
  if (exif.width != null) photo.width = exif.width;
  if (exif.height != null) photo.height = exif.height;
  if (exif.latitude != null && exif.longitude != null) {
    photo.location = { latitude: exif.latitude, longitude: exif.longitude, name: locationName || '' };
  }
  // 移除值为 undefined 的键，保持 JSON 干净
  return Object.fromEntries(Object.entries(photo).filter(([, v]) => v !== undefined));
}

/** 按地点名称查找坐标。 */
function findPlaceByName(name) {
  return PLACES.find((p) => p.name === name);
}

function main() {
  console.log('生成 index.json...');

  // 1) 解析 stages MD
  const stageMDs = readMarkdownDir(DIRS.stagesDir);
  const stages = stageMDs.map(({ data, contentWebPath }) => ({
    id: data.id,
    name: data.name,
    type: data.type,
    startDate: data.start_date,
    endDate: data.end_date,
    cover: data.cover || '',
    themeColor: data.theme_color,
    locations: data.location || [],
    people: data.people || [],
    tags: data.tags || [],
    description: data.description || '',
    content: contentWebPath,
    albumIds: [],
    photoIds: [],
  }));

  // 2) 解析 albums MD
  const albumMDs = readMarkdownDir(DIRS.albumsDir);
  const albums = albumMDs.map(({ data, contentWebPath }) => {
    const place = findPlaceByName(data.location);
    return {
      id: data.id,
      title: data.title,
      date: data.date,
      stageId: data.stage,
      location: place
        ? { latitude: place.latitude, longitude: place.longitude, name: place.name }
        : undefined,
      people: data.people || [],
      cover: data.cover || '',
      content: contentWebPath,
      photoIds: [],
    };
  });

  // 3) 解析 people MD
  const peopleMDs = readMarkdownDir(DIRS.peopleDir);
  const people = peopleMDs.map(({ data, contentWebPath }) => ({
    id: data.id,
    name: data.name,
    avatar: data.avatar || '',
    bio: data.bio || '',
    stageIds: data.stageIds || [],
    content: contentWebPath,
  }));

  // 4) 解析 places MD
  const placeMDs = readMarkdownDir(DIRS.placesDir);
  const places = placeMDs.map(({ data, contentWebPath }) => ({
    id: data.id,
    name: data.name,
    location: { latitude: data.latitude, longitude: data.longitude, name: data.name },
    stageIds: data.stageIds || [],
    photoIds: [],
    content: contentWebPath,
  }));

  // 5) 扫描照片：阶段照片
  const photos = [];

  // 扫描 public/img/ 下每个阶段目录（slug 来自 front matter）
  for (const stage of stages) {
    const slug = stageMDs.find((m) => m.data.id === stage.id)?.data.slug;
    if (!slug) continue;
    const dir = path.join(DIRS.imgDir, slug);
    const files = walkImages(dir);
    const locationName = stage.locations[0] || '';
    for (const f of files) {
      const photo = buildPhoto(f, stage.id, null, locationName);
      photos.push(photo);
      stage.photoIds.push(photo.id);
    }
  }

  // 扫描相册照片
  for (const album of albums) {
    const slug = albumMDs.find((m) => m.data.id === album.id)?.data.slug;
    if (!slug) continue;
    const dir = path.join(DIRS.imgDir, slug);
    const files = walkImages(dir);
    const locationName = album.location?.name || '';
    for (const f of files) {
      const photo = buildPhoto(f, album.stageId, album.id, locationName);
      photos.push(photo);
      album.photoIds.push(photo.id);
    }
  }

  // 6) 交叉关联
  // stage.albumIds
  for (const album of albums) {
    if (album.stageId) {
      const stage = stages.find((s) => s.id === album.stageId);
      if (stage) stage.albumIds.push(album.id);
    }
  }
  // place.photoIds：按 location.name 匹配
  for (const place of places) {
    place.photoIds = photos
      .filter((p) => p.location && p.location.name === place.name)
      .map((p) => p.id);
  }
  // person.stageIds 已由 markdown_formatter 写入 front matter，这里保留

  // 7) 组装并写入
  const index = {
    version: INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    site: SITE,
    stages,
    albums,
    people,
    places,
    photos,
  };
  writeJSON(DIRS.indexFile, index);
  console.log(`  stages: ${stages.length}, albums: ${albums.length}, people: ${people.length}, places: ${places.length}, photos: ${photos.length}`);
  console.log(`已写入 ${path.relative(DIRS.projectRoot, DIRS.indexFile)}`);
}

main();
