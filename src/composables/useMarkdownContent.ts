/**
 * useMarkdownContent — 异步加载 Markdown 文件内容
 *
 * 当 content 是文件路径（以 / 开头）时自动 fetch；
 * 否则视为内联 Markdown 字符串直接返回。
 */
import { ref, watch, type Ref } from 'vue'

const cache = new Map<string, string>()

/** 去除 YAML Front Matter（--- ... ---），保留正文 */
function stripFrontMatter(text: string): string {
  const trimmed = text.trimStart()
  if (!trimmed.startsWith('---')) return text
  const end = trimmed.indexOf('---', 3)
  if (end === -1) return text
  return trimmed.slice(end + 3).trimStart()
}

export function useMarkdownContent(content: Ref<string | undefined>) {
  const markdown = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(value: string | undefined) {
    if (!value) {
      markdown.value = ''
      return
    }

    // 内联 Markdown（非路径）直接使用
    if (!value.startsWith('/')) {
      markdown.value = stripFrontMatter(value)
      return
    }

    // 文件路径：先查缓存
    if (cache.has(value)) {
      markdown.value = cache.get(value)!
      return
    }

    loading.value = true
    error.value = null
    try {
      const res = await fetch(value)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = stripFrontMatter(await res.text())
      cache.set(value, text)
      markdown.value = text
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      markdown.value = ''
    } finally {
      loading.value = false
    }
  }

  watch(content, (v) => load(v), { immediate: true })

  return { markdown, loading, error }
}
