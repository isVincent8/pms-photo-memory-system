/** exportUtils — 前端导出通用工具
 *
 * 提供浏览器端文件下载辅助：JSON、文本、Markdown 等。
 */
import type { Album, Person, Photo, Place, Stage } from '@/types'
import { formatDateRange } from './dateUtils'

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

/** 获取并下载 public/data/index.json */
export async function exportIndexJson(): Promise<void> {
  const res = await fetch('/data/index.json')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const filename = `pms-index-${data.generatedAt ? data.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}.json`
  downloadJson(data, filename)
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
  if (albums.length) lines.push(`- 相册：${albums.map((a) => a.title).join('、')}`)
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
      lines.push(`${i + 1}. ${p.caption || '无标题'}${p.date ? ` (${p.date})` : ''}`)
      if (p.location?.name) lines.push(`   - 地点：${p.location.name}`)
      lines.push(`   - 文件：${p.src}`)
    })
    lines.push('')
  }

  downloadMarkdown(lines.join('\n'), `${stage.id}.md`)
}

export function exportStageJson(ctx: StageExportContext) {
  const { stage, photos, albums, people, places } = ctx
  downloadJson(
    { stage, photos, albums, people, places },
    `${stage.id}.json`,
  )
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
  if (album.date) lines.push(`- 日期：${album.date}`)
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
      lines.push(`${i + 1}. ${p.caption || '无标题'}${p.date ? ` (${p.date})` : ''}`)
      if (p.location?.name) lines.push(`   - 地点：${p.location.name}`)
      lines.push(`   - 文件：${p.src}`)
    })
    lines.push('')
  }

  downloadMarkdown(lines.join('\n'), `${album.id}.md`)
}

export function exportAlbumJson(ctx: AlbumExportContext) {
  const { album, photos, stage } = ctx
  downloadJson({ album, photos, stage }, `${album.id}.json`)
}
