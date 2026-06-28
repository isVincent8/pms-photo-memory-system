// 照片迁移与重命名脚本（Task 1.1 + 1.4）
// 将 scripts/raw-data/photos-raw/{阶段}/ 下的原始照片迁移至 public/img/{slug}/，
// 统一命名为 {slug}-{NNN}.{ext}（扩展名小写），消除中文/不规则文件名。
// 幂等：按原始文件名排序后固定分配序号，多次运行结果一致；目标同名覆盖。
//
// 用法：node data-process/relocate_photos.js

import path from 'node:path';
import { DIRS, STAGES, ALBUMS, photoTargetName } from './config.js';
import { walkImages, copyFile, ensureDir, globTopDir } from './utils.js';

function migrate(groupName, slug, rawPhotoGlob) {
  const srcDir = path.join(DIRS.rawPhotos, globTopDir(rawPhotoGlob));
  const files = walkImages(srcDir);
  if (files.length === 0) {
    console.warn(`  [${groupName}] 未找到照片：${srcDir}`);
    return 0;
  }
  const destDir = path.join(DIRS.imgDir, slug);
  ensureDir(destDir);
  files.forEach((src, i) => {
    const ext = path.extname(src);
    const destName = photoTargetName(slug, i + 1, ext);
    copyFile(src, path.join(destDir, destName));
  });
  console.log(`  [${groupName}] 迁移 ${files.length} 张 -> public/img/${slug}/`);
  return files.length;
}

function main() {
  console.log('照片迁移开始...');
  let total = 0;
  for (const stage of STAGES) {
    total += migrate(stage.name, stage.slug, stage.rawPhotoGlob);
  }
  for (const album of ALBUMS) {
    total += migrate(album.title, album.slug, album.rawPhotoGlob);
  }
  console.log(`照片迁移完成，共 ${total} 张。`);
}

main();
