<script setup lang="ts">
/**
 * PhotoGrid —— 照片网格 / 瀑布流容器
 *
 * 支持 grid（等高官方式网格）与 masonry（CSS columns 瀑布流）两种模式。
 * 每张照片通过 LazyImage（IntersectionObserver）懒加载并淡入。
 * 点击照片触发 select 事件，供上层打开 Lightbox。
 */
import type { Photo } from '@/types'
import { formatRelative } from '@/utils/dateUtils'
import LazyImage from '@/components/LazyImage.vue'
import { Check } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type GridMode = 'grid' | 'masonry'

const props = withDefaults(
  defineProps<{
    photos: Photo[]
    /** 桌面端列数，移动端自动降为 2 */
    columns?: number
    /** 布局模式：grid 为等高官方式网格，masonry 为瀑布流 */
    mode?: GridMode
    /** 每页渲染数量，默认 50 */
    pageSize?: number
    /** 是否启用多选模式 */
    selectable?: boolean
    /** 当前选中的照片 id 列表 */
    selectedIds?: string[]
  }>(),
  { columns: 3, mode: 'masonry', pageSize: 50, selectable: false, selectedIds: () => [] },
)

const emit = defineEmits<{
  (e: 'select', payload: { photo: Photo; index: number }): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

function onSelect(photo: Photo, index: number) {
  if (props.selectable) {
    toggleSelect(photo.id)
    return
  }
  emit('select', { photo, index })
}

function toggleSelect(id: string) {
  const current = new Set(props.selectedIds)
  if (current.has(id)) current.delete(id)
  else current.add(id)
  emit('update:selectedIds', Array.from(current))
}

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id)
}

// —— 分页加载：大列表下避免一次性渲染全部照片 ——
const visibleCount = ref(Math.min(props.pageSize, props.photos.length))
const visiblePhotos = computed(() => props.photos.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < props.photos.length)

watch(
  () => props.photos,
  () => {
    visibleCount.value = Math.min(props.pageSize, props.photos.length)
    nextTick(observeSentinel)
  },
)

function loadMore() {
  if (!hasMore.value) return
  visibleCount.value = Math.min(visibleCount.value + props.pageSize, props.photos.length)
  nextTick(observeSentinel)
}

const sentinelRef = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

function observeSentinel() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value || !hasMore.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    },
    { rootMargin: '200px' },
  )
  observer.observe(sentinelRef.value)
}

onMounted(observeSentinel)
onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

// 瀑布流模式下，优先使用真实宽高比，否则按 id 哈希分配一组错落比例
const RATIOS = [1.2, 1.4, 1.5, 1.6, 1.8]
function getAspectRatio(photo: Photo): number {
  if (photo.width && photo.height) return photo.width / photo.height
  let h = 0
  for (const ch of photo.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return RATIOS[h % RATIOS.length]
}
</script>

<template>
  <div
    :class="mode === 'grid' ? 'grid gap-5' : 'masonry-root'"
    :style="mode === 'grid'
      ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
      : { columnCount: columns, columnGap: '1.25rem' }"
  >
    <button
      v-for="(photo, index) in visiblePhotos"
      :key="photo.id"
      type="button"
      class="group relative mb-5 block w-full overflow-hidden rounded-2xl bg-secondary text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="[
        mode === 'masonry' ? 'break-inside-avoid' : '',
        selectable
          ? isSelected(photo.id)
            ? 'ring-2 ring-primary shadow-card-hover'
            : 'hover:shadow-card-hover hover:-translate-y-1'
          : 'hover:shadow-card-hover hover:-translate-y-1',
      ]"
      @click="onSelect(photo, index)"
    >
      <!-- 多选指示器 -->
      <div
        v-if="selectable"
        class="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-colors"
        :class="isSelected(photo.id)
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-white/70 bg-black/30 text-transparent group-hover:border-white group-hover:text-white/70'"
      >
        <Check :size="12" stroke-width="3" />
      </div>

      <LazyImage
        :src="photo.thumbnail || photo.src"
        :alt="photo.caption ?? ''"
        :aspect-ratio="mode === 'grid' ? 1 : getAspectRatio(photo)"
        class="h-full w-full"
      />

      <!-- 悬停信息浮层 -->
      <div
        class="pointer-events-none absolute inset-0 flex flex-col justify-end rounded-2xl bg-gradient-to-t from-background/90 via-background/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <p v-if="photo.caption" class="text-sm font-medium text-foreground">{{ photo.caption }}</p>
        <p v-if="photo.date" class="mt-0.5 text-xs text-muted-foreground">
          {{ formatRelative(photo.date) }}
        </p>
      </div>
    </button>
  </div>

  <!-- 加载更多占位与按钮 -->
  <div
    v-if="hasMore"
    ref="sentinelRef"
    class="mt-6 flex flex-col items-center justify-center"
  >
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      @click="loadMore"
    >
      加载更多
    </button>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .masonry-root {
    column-count: 2 !important;
  }
  div[style*='grid-template-columns'] {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
</style>
