/** exportUtils — 前端导出通用工具
 *
 * 提供浏览器端文件下载辅助：JSON、文本、Markdown、ZIP 压缩包、PDF 打印等。
 */
import type { Album, Person, Photo, Place, Stage } from '@/types'
import { formatDate, formatDateRange } from './dateUtils'
import JSZip from 'jszip'

/** 触发浏览器下载一段文本内容 */
export function downloadText(text: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 下载 JSON 对象 */
export function downloadJson(data: unknown, filename: string) {
  const text = JSON.stringify(data, null, 2)
  downloadText(text, filename, 'application/json')
}

/** 下载 Markdown 文本 */
export function downloadMarkdown(text: string, filename: string) {
  downloadText(text, filename, 'text/markdown')
}

/** 下载二进制文件 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 获取并下载 public/data/index.json */
export async function exportIndexJson(): Promise<void> {
  const res = await fetch('/data/index.json')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const filename = `pms-index-${data.generatedAt ? data.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}.json`
  downloadJson(data, filename)
}

// —— 图片获取与打包 ——

async function fetchBlob(path: string): Promise<Blob | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}

function filenameFromPath(path: string): string {
  return path.split('/').pop() || 'image.jpg'
}

/** 将多个照片打包成 ZIP */
export async function exportPhotosZip(photos: Photo[], name: string): Promise<void> {
  const zip = new JSZip()
  const folder = zip.folder(name)
  if (!folder) return

  for (const p of photos) {
    const blob = await fetchBlob(p.src)
    if (!blob) continue
    folder.file(filenameFromPath(p.src), blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, `${name}.zip`)
}

// —— 照片集合导出 ——

export interface PhotosExportContext {
  photos: Photo[]
  title: string
  subtitle?: string
}

export function exportPhotosMarkdown(ctx: PhotosExportContext) {
  const { photos, title, subtitle } = ctx
  const lines: string[] = []
  lines.push(`# ${title}`)
  if (subtitle) lines.push('')
  if (subtitle) lines.push(subtitle)
  lines.push('')
  lines.push(`共 ${photos.length} 张照片。`)
  lines.push('')

  photos.forEach((p, i) => {
    lines.push(`## ${i + 1}. ${p.caption || '无标题'}`)
    if (p.date) lines.push(`- 日期：${formatDate(p.date)}`)
    if (p.location?.name) lines.push(`- 地点：${p.location.name}`)
    if (p.note) lines.push(`- 备注：${p.note}`)
    lines.push(`![${p.caption || '照片'}](${p.src})`)
    lines.push('')
  })

  downloadMarkdown(lines.join('\n'), `${sanitizeFilename(title)}.md`)
}

export function exportPhotosJson(ctx: PhotosExportContext) {
  const { photos, title, subtitle } = ctx
  downloadJson({ title, subtitle, photoCount: photos.length, photos }, `${sanitizeFilename(title)}.json`)
}

export async function exportPhotosWithImagesZip(ctx: PhotosExportContext) {
  const { photos, title } = ctx
  const zip = new JSZip()
  const folder = zip.folder(sanitizeFilename(title))
  if (!folder) return

  // index.json
  folder.file('index.json', JSON.stringify({ title, photoCount: photos.length, photos }, null, 2))
  // README.md
  folder.file('README.md', buildPhotosReadme(ctx))

  for (const p of photos) {
    const blob = await fetchBlob(p.src)
    if (!blob) continue
    folder.file(`images/${filenameFromPath(p.src)}`, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, `${sanitizeFilename(title)}-with-images.zip`)
}

export async function exportPhotosMarkdownWithImagesZip(ctx: PhotosExportContext) {
  const { photos, title } = ctx
  const zip = new JSZip()
  const folder = zip.folder(sanitizeFilename(title))
  if (!folder) return

  const lines: string[] = []
  lines.push(`# ${title}`)
  lines.push('')
  photos.forEach((p, i) => {
    lines.push(`## ${i + 1}. ${p.caption || '无标题'}`)
    if (p.date) lines.push(`- 日期：${formatDate(p.date)}`)
    if (p.location?.name) lines.push(`- 地点：${p.location.name}`)
    if (p.note) lines.push(`- 备注：${p.note}`)
    lines.push(`![${p.caption || '照片'}](images/${filenameFromPath(p.src)})`)
    lines.push('')
  })
  folder.file(`${sanitizeFilename(title)}.md`, lines.join('\n'))

  for (const p of photos) {
    const blob = await fetchBlob(p.src)
    if (!blob) continue
    folder.file(`images/${filenameFromPath(p.src)}`, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, `${sanitizeFilename(title)}-markdown-images.zip`)
}

function buildPhotosReadme(ctx: PhotosExportContext): string {
  const { photos, title, subtitle } = ctx
  const lines: string[] = []
  lines.push(`# ${title}`)
  if (subtitle) lines.push(`\n${subtitle}`)
  lines.push(`\n共 ${photos.length} 张照片。\n`)
  photos.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.caption || '无标题'} (${formatDate(p.date ?? '') || '无日期'})`)
  })
  return lines.join('\n')
}

/** 打开一个仅包含导出内容的打印窗口，用于保存 PDF */
export function exportPhotosPrint(ctx: PhotosExportContext) {
  const { photos, title, subtitle } = ctx
  const win = window.open('', '_blank')
  if (!win) return

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; color: #222; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .photo { margin-bottom: 32px; page-break-inside: avoid; }
    .photo img { max-width: 100%; border-radius: 8px; display: block; margin: 12px 0; }
    .caption { font-size: 16px; font-weight: 600; }
    .meta { font-size: 12px; color: #666; margin-top: 4px; }
    .note { font-size: 14px; margin-top: 8px; line-height: 1.6; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
  ${photos
    .map(
      (p) => `
    <div class="photo">
      <div class="caption">${escapeHtml(p.caption || '无标题')}</div>
      ${p.date ? `<div class="meta">${formatDate(p.date)}${p.location?.name ? ` · ${p.location.name}` : ''}</div>` : ''}
      <img src="${p.src}" alt="${escapeHtml(p.caption || '照片')}" />
      ${p.note ? `<div class="note">${escapeHtml(p.note)}</div>` : ''}
    </div>
  `,
    )
    .join('')}
</body>
</html>
  `
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-').slice(0, 80)
}

// —— Stage 导出 ——

export interface StageExportContext {
  stage: Stage
  photos: Photo[]
  albums: Album[]
  people: Person[]
  places: Place[]
}

export function exportStageMarkdown(ctx: StageExportContext) {
  const { stage, photos, albums, people, places } = ctx
  const lines: string[] = []
  lines.push(`# ${stage.name}`)
  lines.push('')
  lines.push(`- 时间：${formatDateRange(stage.startDate, stage.endDate)}`)
  if (stage.description) lines.push(`- 简介：${stage.description}`)
  if (places.length) lines.push(`- 地点：${places.map((p) => p.name).join('、')}`)
  if (people.length) lines.push(`- 人物：${people.map((p) => p.name).join('、')}`)
  if (albums.length) lines.push(`- 故事：${albums.map((a) => a.title).join('、')}`)
  if (stage.tags?.length) lines.push(`- 标签：${stage.tags.join('、')}`)
  lines.push('')

  if (stage.content) {
    lines.push('## 故事')
    lines.push('')
    lines.push(stage.content)
    lines.push('')
  }

  if (photos.length) {
    lines.push('## 照片')
    lines.push('')
    photos.forEach((p, i) => {
      lines.push(`### ${i + 1}. ${p.caption || '无标题'}`)
      if (p.date) lines.push(`- 日期：${formatDate(p.date)}`)
      if (p.location?.name) lines.push(`- 地点：${p.location.name}`)
      if (p.note) lines.push(`- 备注：${p.note}`)
      lines.push(`![${p.caption || '照片'}](${p.src})`)
      lines.push('')
    })
    lines.push('')
  }

  downloadMarkdown(lines.join('\n'), `${stage.id}.md`)
}

export function exportStageJson(ctx: StageExportContext) {
  const { stage, photos, albums, people, places } = ctx
  downloadJson({ stage, photos, albums, people, places }, `${stage.id}.json`)
}

export async function exportStageZip(ctx: StageExportContext) {
  const { stage, photos } = ctx
  await exportPhotosWithImagesZip({
    photos,
    title: stage.name,
    subtitle: `${formatDateRange(stage.startDate, stage.endDate)} · 共 ${photos.length} 张`,
  })
}

// —— Album 导出 ——

export interface AlbumExportContext {
  album: Album
  photos: Photo[]
  stage?: Stage
}

export function exportAlbumMarkdown(ctx: AlbumExportContext) {
  const { album, photos, stage } = ctx
  const lines: string[] = []
  lines.push(`# ${album.title}`)
  lines.push('')
  lines.push(`- 日期：${album.endDate ? `${album.date} ~ ${album.endDate}` : album.date}`)
  if (album.location?.name) lines.push(`- 地点：${album.location.name}`)
  if (stage) lines.push(`- 阶段：${stage.name}`)
  lines.push('')

  if (album.content) {
    lines.push('## 故事')
    lines.push('')
    lines.push(album.content)
    lines.push('')
  }

  if (photos.length) {
    lines.push('## 照片')
    lines.push('')
    photos.forEach((p, i) => {
      lines.push(`### ${i + 1}. ${p.caption || '无标题'}`)
      if (p.date) lines.push(`- 日期：${formatDate(p.date)}`)
      if (p.location?.name) lines.push(`- 地点：${p.location.name}`)
      if (p.note) lines.push(`- 备注：${p.note}`)
      lines.push(`![${p.caption || '照片'}](${p.src})`)
      lines.push('')
    })
    lines.push('')
  }

  downloadMarkdown(lines.join('\n'), `${album.id}.md`)
}

export function exportAlbumJson(ctx: AlbumExportContext) {
  const { album, photos, stage } = ctx
  downloadJson({ album, photos, stage }, `${album.id}.json`)
}

export async function exportAlbumZip(ctx: AlbumExportContext) {
  const { album, photos, stage } = ctx
  await exportPhotosWithImagesZip({
    photos,
    title: album.title,
    subtitle: stage ? `所属阶段：${stage.name}` : undefined,
  })
}
