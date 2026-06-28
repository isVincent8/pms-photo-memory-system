<script setup lang="ts">
/**
 * ExportMenu —— 导出下拉菜单
 *
 * 提供一个触发按钮，点击后展示导出选项（Markdown / JSON / PDF 打印）。
 */
import { ref } from 'vue'
import { Download, FileText, FileJson, Printer } from 'lucide-vue-next'

export interface ExportOption {
  key: string
  label: string
  icon: typeof FileText
}

const props = defineProps<{
  options?: ExportOption[]
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const open = ref(false)

const defaultOptions: ExportOption[] = [
  { key: 'markdown', label: '导出 Markdown', icon: FileText },
  { key: 'json', label: '导出 JSON', icon: FileJson },
  { key: 'print', label: '打印 / PDF', icon: Printer },
]

const items = props.options ?? defaultOptions

function onSelect(key: string) {
  open.value = false
  emit('select', key)
}

function onBlur(e: FocusEvent) {
  // 当下一个焦点不在菜单内时关闭
  const related = e.relatedTarget as HTMLElement | null
  if (!related?.closest('[data-export-menu]')) {
    open.value = false
  }
}
</script>

<template>
  <div data-export-menu class="relative inline-block">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Download :size="14" />
      导出
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-20 mt-1.5 w-40 rounded-xl border border-border bg-card py-1 shadow-card"
      tabindex="-1"
      @blur="onBlur"
    >
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary"
        @click="onSelect(item.key)"
      >
        <component :is="item.icon" :size="14" />
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
