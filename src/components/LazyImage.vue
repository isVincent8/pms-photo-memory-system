<script setup lang="ts">
/**
 * LazyImage — 基于 IntersectionObserver 的图片懒加载组件
 *
 * 进入视口前显示占位骨架，进入后加载真实图源并淡入。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ImageSrcSet } from '@/types'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    aspectRatio?: number
    /** 圆角类 */
    rounded?: string
    srcset?: ImageSrcSet
    sizes?: string
    objectFit?: 'cover' | 'contain'
  }>(),
  { alt: '', aspectRatio: 1.5, rounded: 'rounded-2xl', objectFit: 'cover' },
)

const target = ref<HTMLDivElement | null>(null)
const visible = ref(false)
const loaded = ref(false)
const error = ref(false)
let observer: IntersectionObserver | null = null

function disconnect() {
  observer?.disconnect()
  observer = null
}

function observe() {
  if (!target.value || visible.value) return
  disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          visible.value = true
          disconnect()
        }
      }
    },
    { rootMargin: '200px 0px', threshold: 0.01 },
  )
  observer.observe(target.value)
}

onMounted(observe)
onBeforeUnmount(disconnect)
watch(() => props.src, () => {
  loaded.value = false
  error.value = false
  if (visible.value) return
  observe()
})

const paddingTop = `${(1 / (props.aspectRatio || 1.5)) * 100}%`

const imgSrcset = computed(() => {
  if (!props.srcset) return undefined
  const parts: string[] = []
  if (props.srcset.small) parts.push(`${props.srcset.small} 480w`)
  if (props.srcset.medium) parts.push(`${props.srcset.medium} 800w`)
  if (props.srcset.large) parts.push(`${props.srcset.large} 1200w`)
  return parts.length ? parts.join(', ') : undefined
})
</script>

<template>
  <div
    ref="target"
    class="relative overflow-hidden bg-secondary"
    :class="rounded"
    :style="{ paddingTop }"
  >
    <!-- 骨架占位 -->
    <div
      v-show="!loaded && !error"
      class="absolute inset-0 bg-gradient-to-br from-secondary to-muted animate-pulse"
    />
    <img
      v-if="visible"
      :src="src"
      :srcset="imgSrcset"
      :sizes="sizes"
      :alt="alt"
      loading="eager"
      decoding="async"
      class="absolute inset-0 h-full w-full transition-opacity duration-500"
      :class="[
        objectFit === 'contain' ? 'object-contain' : 'object-cover',
        loaded ? 'opacity-100' : 'opacity-0',
      ]"
      @load="loaded = true; error = false"
      @error="error = true"
    />
    <div
      v-if="!loaded && !error"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground/30"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
    <!-- 加载失败占位 -->
    <div
      v-if="error"
      class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground/50"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
      <span class="text-[10px]">图片加载失败</span>
    </div>
  </div>
</template>
