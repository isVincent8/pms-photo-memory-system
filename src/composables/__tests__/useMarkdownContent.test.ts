import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useMarkdownContent } from '../useMarkdownContent'

describe('useMarkdownContent', () => {
  it('strips YAML front matter from inline markdown', async () => {
    const content = ref(`---\nid: test\nname: 测试\n---\n# 标题\n\n正文`)
    const { markdown } = useMarkdownContent(content)
    await nextTick()
    expect(markdown.value).toBe('# 标题\n\n正文')
  })

  it('keeps plain markdown unchanged', async () => {
    const content = ref('# 标题\n\n正文')
    const { markdown } = useMarkdownContent(content)
    await nextTick()
    expect(markdown.value).toBe('# 标题\n\n正文')
  })

  it('returns empty string when content is undefined', async () => {
    const content = ref<string | undefined>(undefined)
    const { markdown } = useMarkdownContent(content)
    await nextTick()
    expect(markdown.value).toBe('')
  })
})
