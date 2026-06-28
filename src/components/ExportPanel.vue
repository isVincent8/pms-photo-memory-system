<script setup lang="ts">
/**
 * ExportPanel —— 统一导出面板
 *
 * 对传入的照片集合提供多种导出格式：PDF 打印、Markdown、JSON、图片压缩包、Markdown+图片。
 */
import { computed, ref } from 'vue'
import type { Photo } from '@/types'
import {
  exportPhotosMarkdown,
  exportPhotosJson,
  exportPhotosWithImagesZip,
  exportPhotosMarkdownWithImagesZip,
  exportPhotosPrint,
} from '@/utils/exportUtils'
import { X, FileText, FileJson, Package, Image, Printer } from 'lucide-vue-next'

const props = defineProps<{
  photos: Photo[]
  title: string
  subtitle?: string
}>()

defineEmits<{ close: [] }>()

const exporting = ref<string | null>(null)

const options = computed(() => [
  { key: 'pdf', label: 'PDF / 打印', desc: '在新窗口排版后保存为 PDF', icon: Printer, async: false },
  { key: 'markdown', label: 'Markdown', desc: '导出 .md 文本文件', icon: FileText, async: false },
  { key: 'json', label: 'JSON', desc: '导出结构化 JSON 数据', icon: FileJson, async: false },
  { key: 'images', label: '图片压缩包', desc: '打包所有原图照片', icon: Image, async: true },
  { key: 'md-images', label: 'Markdown + 图片', desc: 'Markdown 与图片一起打包', icon: Package, async: true },
])

async function onSelect(key: string) {
  const ctx = { photos: props.photos, title: props.title, subtitle: props.subtitle }
  exporting.value = key
  try {
    switch (key) {
      case 'pdf':
        exportPhotosPrint(ctx)
        break
      case 'markdown':
        exportPhotosMarkdown(ctx)
        break
      case 'json':
        exportPhotosJson(ctx)
        break
      case 'images':
        await exportPhotosWithImagesZip(ctx)
        break
      case 'md-images':
        await exportPhotosMarkdownWithImagesZip(ctx)
        break
    }
  } finally {
    exporting.value = null
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
    <div class="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-2xl">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 class="font-display text-base font-semibold text-foreground">导出</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ props.photos.length }} 张照片 · {{ props.title }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          @click="$emit('close')"
        >
          <X :size="18" />
        </button>
      </div>

      <div class="p-2">
        <button
          v-for="opt in options"
          :key="opt.key"
          type="button"
          :disabled="exporting === opt.key || (exporting !== null && opt.async)"
          class="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary disabled:opacity-50"
          @click="onSelect(opt.key)"
        >
          <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            <component :is="opt.icon" :size="18" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-foreground">{{ opt.label }}</span>
              <span
                v-if="exporting === opt.key"
                class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              />
            </div>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ opt.desc }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
