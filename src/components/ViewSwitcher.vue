<script setup lang="ts">
/**
 * ViewSwitcher —— 照片列表视图切换器
 *
 * 提供网格 / 瀑布流两种布局切换，以及一键进入幻灯片（StoryMode）。
 * 网格与瀑布流状态通过 v-model 同步到设置；幻灯片为触发动作。
 */
import { LayoutGrid, Columns, Play } from 'lucide-vue-next'
import type { PhotoViewMode } from '@/stores/uiStore'

const props = defineProps<{
  modelValue: PhotoViewMode
}>()

const emit = defineEmits<{
  'update:modelValue': [mode: PhotoViewMode]
  slideshow: []
}>()

const items: { key: PhotoViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'grid', label: '网格', icon: LayoutGrid },
  { key: 'masonry', label: '瀑布流', icon: Columns },
]

function setMode(mode: PhotoViewMode) {
  if (mode !== props.modelValue) emit('update:modelValue', mode)
}
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border border-border bg-secondary/60 p-1"
    role="group"
    aria-label="照片视图切换"
  >
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
      :class="
        modelValue === item.key
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      "
      :aria-pressed="modelValue === item.key"
      @click="setMode(item.key)"
    >
      <component :is="item.icon" :size="14" />
      <span class="hidden sm:inline">{{ item.label }}</span>
    </button>

    <span class="mx-1 h-3.5 w-px bg-border" />

    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label="播放幻灯片"
      @click="emit('slideshow')"
    >
      <Play :size="14" />
      <span class="hidden sm:inline">幻灯片</span>
    </button>
  </div>
</template>
