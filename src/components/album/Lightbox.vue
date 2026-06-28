<script setup lang="ts">
/**
 * Lightbox — 全屏灯箱
 *
 * 从 uiStore 读取状态，支持键盘 ← → / Esc、触摸滑动切换、点击遮罩关闭。
 * 极简控件，大图片占比。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { formatDate } from '@/utils/dateUtils'
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-vue-next'

const ui = useUiStore()
const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)

useFocusTrap(containerRef, computed(() => ui.lightbox.open))

const current = computed(() => ui.lightbox.photos[ui.lightbox.index])
const total = computed(() => ui.lightbox.photos.length)

function onKey(e: KeyboardEvent) {
  if (!ui.lightbox.open) return
  if (e.key === 'Escape') ui.closeLightbox()
  else if (e.key === 'ArrowRight') ui.lightboxNext()
  else if (e.key === 'ArrowLeft') ui.lightboxPrev()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// 灯箱打开时锁滚动
watch(
  () => ui.lightbox.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function onOverlay(e: MouseEvent) {
  if (e.target === e.currentTarget) ui.closeLightbox()
}

// —— 触摸滑动支持 ——

const SWIPE_THRESHOLD = 50 // px
let touchStartX = 0
let touchStartY = 0
const swipeDelta = ref(0)

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  swipeDelta.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const dx = e.touches[0].clientX - touchStartX
  const dy = e.touches[0].clientY - touchStartY
  // 只处理水平滑动（忽略垂直滚动）
  if (Math.abs(dx) > Math.abs(dy)) {
    swipeDelta.value = dx
  }
}

function onTouchEnd() {
  if (Math.abs(swipeDelta.value) < SWIPE_THRESHOLD) {
    swipeDelta.value = 0
    return
  }
  if (swipeDelta.value > 0) {
    ui.lightboxPrev()
  } else {
    ui.lightboxNext()
  }
  swipeDelta.value = 0
}
</script>

<template>
  <Transition name="lb">
    <div
      v-if="ui.lightbox.open && current"
      ref="containerRef"
      role="dialog"
      aria-modal="true"
      aria-label="照片灯箱"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-xl"
      @click="onOverlay"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 顶栏 -->
      <div class="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 text-sm text-muted-foreground">
        <span class="font-medium">{{ ui.lightbox.index + 1 }} / {{ total }}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="查看照片详情"
            @click="router.push(`/photo/${current.id}`); ui.closeLightbox()"
          >
            <ExternalLink :size="18" />
          </button>
          <button
            type="button"
            class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            @click="ui.closeLightbox()"
          >
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- 上一张 -->
      <button
        v-if="total > 1"
        type="button"
        class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-secondary/80 p-2.5 text-foreground backdrop-blur-sm transition hover:bg-secondary md:left-6"
        aria-label="上一张"
        @click.stop="ui.lightboxPrev()"
      >
        <ChevronLeft :size="24" />
      </button>

      <!-- 主图 -->
      <div class="flex max-h-[90vh] w-full max-w-6xl flex-col items-center px-6" @click.stop>
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
          sizes="(max-width: 768px) 100vw, 80vw"
          :alt="current.caption || ''"
          class="max-h-[78vh] w-auto rounded-2xl object-contain shadow-pop animate-fade-in"
        />
        <div class="mt-4 flex max-w-3xl flex-col items-center gap-1 text-center">
          <p v-if="current.caption" class="text-base font-medium text-foreground">{{ current.caption }}</p>
          <div class="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span v-if="current.date">{{ formatDate(current.date) }}</span>
            <span v-if="current.location?.name">· {{ current.location.name }}</span>
          </div>
        </div>
      </div>

      <!-- 下一张 -->
      <button
        v-if="total > 1"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-secondary/80 p-2.5 text-foreground backdrop-blur-sm transition hover:bg-secondary md:right-6"
        aria-label="下一张"
        @click.stop="ui.lightboxNext()"
      >
        <ChevronRight :size="24" />
      </button>

      <!-- 缩略条 -->
      <div
        v-if="total > 1"
        class="absolute inset-x-0 bottom-0 flex justify-center gap-2 overflow-x-auto px-4 py-4"
        @click.stop
      >
        <button
          v-for="(p, i) in ui.lightbox.photos"
          :key="p.id"
          type="button"
          class="h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-2 transition"
          :class="i === ui.lightbox.index ? 'ring-primary' : 'ring-transparent opacity-60 hover:opacity-100'
          "
          @click="ui.lightboxGoto(i)"
        >
          <img :src="p.thumbnail" :alt="p.caption || ''" class="h-full w-full object-cover" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.25s ease;
}
.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}
</style>
