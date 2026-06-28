<script setup lang="ts">
/**
 * StoryMode —— 沉浸式幻灯片/故事模式
 *
 * 全屏自动播放照片，每张展示图片、说明、日期、地点与进度条。
 * 支持键盘方向键/Esc/空格、触摸滑动、点击暂停/继续。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Photo } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import { Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

const props = defineProps<{
  photos: Photo[]
  initialIndex?: number
  interval?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const intervalMs = computed(() => (props.interval ?? 5) * 1000)
const index = ref(props.initialIndex ?? 0)
const playing = ref(true)
const progress = ref(0)
const showControls = ref(true)
let progressTimer: number | null = null
let hideControlsTimer: number | null = null

const current = computed(() => props.photos[index.value])
const total = computed(() => props.photos.length)

function clamp(i: number) {
  return ((i % total.value) + total.value) % total.value
}

function next() {
  index.value = clamp(index.value + 1)
}

function prev() {
  index.value = clamp(index.value - 1)
}

function goto(i: number) {
  index.value = clamp(i)
}

function togglePlay() {
  playing.value = !playing.value
}

function resetControlsTimer() {
  showControls.value = true
  if (hideControlsTimer) window.clearTimeout(hideControlsTimer)
  hideControlsTimer = window.setTimeout(() => {
    if (playing.value) showControls.value = false
  }, 3000)
}

function onInteraction() {
  resetControlsTimer()
}

function startProgress() {
  stopProgress()
  progress.value = 0
  const tick = 50
  progressTimer = window.setInterval(() => {
    progress.value += tick / intervalMs.value
    if (progress.value >= 1) {
      next()
    }
  }, tick)
}

function stopProgress() {
  if (progressTimer) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
}

watch(playing, (p) => {
  if (p) startProgress()
  else stopProgress()
})

watch(index, () => {
  if (playing.value) startProgress()
})

onMounted(() => {
  document.body.style.overflow = 'hidden'
  startProgress()
  resetControlsTimer()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  stopProgress()
  if (hideControlsTimer) window.clearTimeout(hideControlsTimer)
  window.removeEventListener('keydown', onKey)
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === ' ') {
    e.preventDefault()
    togglePlay()
  }
}

// 触摸滑动
let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  touchStartX = e.touches[0].clientX
}

function onTouchEnd(e: TouchEvent) {
  if (e.changedTouches.length !== 1) return
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) > 50) {
    dx > 0 ? prev() : next()
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-background"
    @click="onInteraction"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- 顶部控制栏 -->
    <div
      class="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-5 py-4 transition-opacity duration-300"
      :class="showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <span class="text-sm font-medium text-white/90">
        {{ index + 1 }} / {{ total }}
      </span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-full p-2 text-white/90 transition-colors hover:bg-white/20"
          @click.stop="togglePlay"
        >
          <Pause v-if="playing" :size="20" />
          <Play v-else :size="20" />
        </button>
        <button
          type="button"
          class="rounded-full p-2 text-white/90 transition-colors hover:bg-white/20"
          @click.stop="$emit('close')"
        >
          <X :size="20" />
        </button>
      </div>
    </div>

    <!-- 上一张 -->
    <button
      type="button"
      class="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white/90 backdrop-blur-sm transition-opacity hover:bg-black/50 md:left-6"
      :class="showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      aria-label="上一张"
      @click.stop="prev"
    >
      <ChevronLeft :size="24" />
    </button>

    <!-- 主图与信息 -->
    <div class="relative flex h-full w-full flex-col items-center justify-center">
      <img
        :key="current.id"
        :src="current.src"
        :srcset="current.srcset
          ? [
              current.srcset.small && `${current.srcset.small} 480w`,
              current.srcset.medium && `${current.srcset.medium} 800w`,
              current.srcset.large && `${current.srcset.large} 1200w`,
            ].filter(Boolean).join(', ')
          : undefined"
        sizes="(max-width: 768px) 92vw, 80vw"
        :alt="current.caption || ''"
        class="max-h-[82vh] max-w-[92vw] object-contain animate-fade-in"
        @click.stop="togglePlay"
      />

      <div
        class="absolute bottom-16 left-0 right-0 mx-auto max-w-3xl px-6 text-center transition-opacity duration-300"
        :class="showControls ? 'opacity-100' : 'opacity-0'"
      >
        <p v-if="current.caption" class="text-lg font-medium text-white drop-shadow-md">
          {{ current.caption }}
        </p>
        <p class="mt-1 text-sm text-white/80 drop-shadow-md">
          <span v-if="current.date">{{ formatDate(current.date) }}</span>
          <span v-if="current.location?.name"> · {{ current.location.name }}</span>
        </p>
      </div>
    </div>

    <!-- 下一张 -->
    <button
      type="button"
      class="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white/90 backdrop-blur-sm transition-opacity hover:bg-black/50 md:right-6"
      :class="showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      aria-label="下一张"
      @click.stop="next"
    >
      <ChevronRight :size="24" />
    </button>

    <!-- 底部缩略条与进度 -->
    <div
      class="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-5 pb-5 pt-8 transition-opacity duration-300"
      :class="showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <!-- 进度条 -->
      <div class="mb-4 h-0.5 w-full bg-white/20">
        <div
          class="h-full bg-white transition-all duration-75 ease-linear"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>

      <div class="flex justify-center gap-2 overflow-x-auto">
        <button
          v-for="(p, i) in photos"
          :key="p.id"
          type="button"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-2 transition"
          :class="i === index ? 'ring-primary' : 'ring-transparent opacity-60 hover:opacity-100'"
          @click.stop="goto(i)"
        >
          <img
            v-if="p.thumbnail || p.src"
            :src="p.thumbnail || p.src"
            :alt="p.caption || ''"
            class="h-full w-full object-cover"
          />
        </button>
      </div>
    </div>
  </div>
</template>
