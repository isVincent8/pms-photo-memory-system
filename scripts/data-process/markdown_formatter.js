// Markdown 格式化与生成脚本（Task 1.2 + 1.4）
// 将 scripts/raw-data/notes-raw/ 下的原始手账笔记转换为标准 CommonMark Markdown，
// 注入 YAML Front Matter，输出至 public/data/stages/。
// 同时生成 people/places/albums 的内容 Markdown，供前端 MarkdownRenderer 渲染。
// 中文字符以 UTF-8 写入，无 BOM；换行统一为 LF，避免乱码。
//
// 用法：node data-process/markdown_formatter.js

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DIRS, STAGES, PEOPLE, PLACES, ALBUMS, toWebPath } from './config.js';
import { ensureDir } from './utils.js';

/**
 * 将原始手账纯文本格式化为 CommonMark 正文（不含 front matter）。
 * 规则：
 *  - 统一 LF、去行尾空白、去每行前导空白（消除手账缩进）；
 *  - 以全角/半角冒号结尾的短行视为小节标题，转为 ## ；
 *  - 以「-」开头的行保持为无序列表，并补齐「- 」前缀；
 *  - 空行分隔段落；首行若与阶段名相同则丢弃（标题由 # 注入）。
 */
function formatNoteBody(raw, stageName) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let prevBlank = false;
  for (let line of lines) {
    line = line.replace(/\s+$/g, '').trimStart();
    if (line === '') {
      if (!prevBlank && out.length > 0) out.push('');
      prevBlank = true;
      continue;
    }
    // 丢弃与阶段名重复的首行标题
    if (out.length === 0 && line === stageName) {
      prevBlank = false;
      continue;
    }
    // 小节标题：以冒号结尾且较短
    if (/[：:]$/.test(line) && line.length <= 20) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push('## ' + line.replace(/[：:]$/, ''));
      out.push('');
      prevBlank = true;
      continue;
    }
    // 列表项：补齐「- 」前缀
    if (/^[-•]\s*/.test(line)) {
      out.push('- ' + line.replace(/^[-•]\s*/, ''));
      prevBlank = false;
      continue;
    }
    out.push(line);
    prevBlank = false;
  }
  // 清理末尾多余空行
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

/** 读取阶段封面图（取该阶段第一张照片的 web 路径，若无则为空）。 */
function stageCover(slug) {
  const dir = path.join(DIRS.imgDir, slug);
  if (!fs.existsSync(dir)) return '';
  const first = fs.readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
    .sort()[0];
  return first ? toWebPath(path.join(dir, first)) : '';
}

function generateStageMarkdown(stage) {
  const notePath = path.join(DIRS.rawNotes, stage.rawNoteFile);
  let rawNote = '';
  if (fs.existsSync(notePath)) {
    rawNote = fs.readFileSync(notePath, 'utf8');
  } else {
    console.warn(`  [${stage.name}] 原始笔记缺失：${notePath}`);
  }
  const body = formatNoteBody(rawNote, stage.name);
  const cover = stageCover(stage.slug);
  const frontMatter = {
    id: stage.id,
    name: stage.name,
    type: stage.type,
    start_date: stage.startDate,
    end_date: stage.endDate,
    cover,
    theme_color: stage.themeColor,
    location: stage.locations,
    people: stage.people,
    tags: stage.tags,
    slug: stage.slug,
    description: stage.description,
  };
  const content = `# ${stage.name}\n\n${body}\n`;
  const file = path.join(DIRS.stagesDir, `${stage.slug}.md`);
  const output = matter.stringify(content, frontMatter);
  ensureDir(DIRS.stagesDir);
  fs.writeFileSync(file, output, 'utf8');
  console.log(`  [stage] ${stage.slug}.md`);
}

function generatePeopleMarkdown() {
  ensureDir(DIRS.peopleDir);
  for (const p of PEOPLE) {
    // 反查关联阶段
    const stageIds = STAGES.filter((s) => s.people.includes(p.id)).map((s) => s.id);
    const frontMatter = {
      id: p.id,
      name: p.name,
      bio: p.bio,
      stageIds,
    };
    const content = `# ${p.name}\n\n${p.bio}\n\n关联阶段：${stageIds.length ? stageIds.join('、') : '暂无'}\n`;
    const file = path.join(DIRS.peopleDir, `${p.id}.md`);
    fs.writeFileSync(file, matter.stringify(content, frontMatter), 'utf8');
    console.log(`  [person] ${p.id}.md`);
  }
}

function generatePlacesMarkdown() {
  ensureDir(DIRS.placesDir);
  for (const pl of PLACES) {
    const stageIds = STAGES.filter((s) => s.locations.includes(pl.name)).map((s) => s.id);
    const frontMatter = {
      id: pl.id,
      name: pl.name,
      latitude: pl.latitude,
      longitude: pl.longitude,
      stageIds,
    };
    const content = `# ${pl.name}\n\n坐标：${pl.latitude}, ${pl.longitude}\n\n关联阶段：${stageIds.length ? stageIds.join('、') : '暂无'}\n`;
    const file = path.join(DIRS.placesDir, `${pl.id}.md`);
    fs.writeFileSync(file, matter.stringify(content, frontMatter), 'utf8');
    console.log(`  [place] ${pl.id}.md`);
  }
}

function generateAlbumsMarkdown() {
  ensureDir(DIRS.albumsDir);
  for (const a of ALBUMS) {
    const place = PLACES.find((p) => p.id === a.placeId);
    const cover = stageCover(a.slug);
    const frontMatter = {
      id: a.id,
      title: a.title,
      date: a.date,
      stage: a.stageId,
      place: a.placeId,
      location: place ? place.name : '',
      people: a.people,
      slug: a.slug,
      cover,
    };
    const content = `# ${a.title}\n\n${a.description}\n`;
    const file = path.join(DIRS.albumsDir, `${a.slug}.md`);
    fs.writeFileSync(file, matter.stringify(content, frontMatter), 'utf8');
    console.log(`  [album] ${a.slug}.md`);
  }
}

function main() {
  console.log('Markdown 格式化开始...');
  for (const stage of STAGES) generateStageMarkdown(stage);
  generatePeopleMarkdown();
  generatePlacesMarkdown();
  generateAlbumsMarkdown();
  console.log('Markdown 格式化完成。');
}

main();
