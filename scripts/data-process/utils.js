// 数据工程脚本共享工具：文件遍历、目录创建、JSON 读写、扩展名处理。
// 仅依赖 Node 内置模块，避免额外安装。

import fs from 'node:fs';
import path from 'node:path';
import { IMAGE_EXTENSIONS } from './config.js';

/** 递归确保目录存在。 */
export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** 递归遍历目录，返回所有图片文件绝对路径（按路径名排序，保证幂等）。 */
export function walkImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) {
        // 跳过缩略图目录与元数据目录
        if (e.name === 'thumbs' || e.name === '_meta') continue;
        stack.push(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) out.push(full);
      }
    }
  }
  return out.sort();
}

/** 同步复制文件，覆盖目标。 */
export function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/** 读取 JSON 文件。 */
export function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 写入 JSON 文件：UTF-8 无 BOM，2 空格缩进，末尾换行，保证跨平台一致。 */
export function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  const text = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(file, text, 'utf8');
}

/** 从 rawPhotoGlob 模式中提取顶层子目录名（第一个路径段）。 */
export function globTopDir(globPattern) {
  return globPattern.split('/')[0];
}

/** 取文件基名（不含扩展名）。 */
export function basename(p) {
  return path.basename(p, path.extname(p));
}
