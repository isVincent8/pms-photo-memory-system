<script setup lang="ts">
/**
 * MapDetailOverlay —— 地图选中详情面板
 *
 * 从 uiStore 读取 selectedPhotoId / selectedPlaceId，展示对应的照片或地点详情。
 * 桌面端：右侧固定面板（400px）；移动端：底部全屏抽屉。
 * 支持关联 Stage / Album 链接导航。
 */
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { formatDate } from '@/utils/dateUtils'
import { X, MapPin, Calendar, ArrowLeft } from 'lucide-vue-next'

const data = useDataStore()
const ui = useUiStore()

defineEmits<{ (e: 'close'): void }>()

const selectedPhoto = computed(() => data.getPhoto(ui.selectedPhotoId))
const selectedPlace = computed(() => data.getPlace(ui.selectedPlaceId))

const photoStage = computed(() => {
  const sid = selectedPhoto.value?.stageId
  return sid ? data.getStage(sid) : undefined
})

const photoAlbum = computed(() => {
  const aid = selectedPhoto.value?.albumId
  return aid ? data.getAlbum(aid) : undefined
})

const placeStages = computed(() => {
  const ids = selectedPlace.value?.stageIds ?? []
  return ids.map((id) => data.getStage(id)).filter((s) => s !== undefined)
})

// —— 移动端滑动关闭 ——
const SWIPE_DOWN_THRESHOLD = 80
let touchStartY = 0
const swipeDeltaY = ref(0)

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  touchStartY = e.touches[0].clientY
  swipeDeltaY.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const dy = e.touches[0].clientY - touchStartY
  if (dy > 0) swipeDeltaY.value = dy
}

function onTouchEnd() {
  if (swipeDeltaY.value > SWIPE_DOWN_THRESHOLD) {
    ui.selectedPhotoId = null
    ui.selectedPlaceId = null
  }
  swipeDeltaY.value = 0
}
</script>

<template>
  <Transition name="overlay-slide">
    <div
      v-if="selectedPhoto || selectedPlace"
      class="pointer-events-auto absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-border bg-card/95 backdrop-blur-xl md:w-[400px]"
      :style="swipeDeltaY > 0 ? { transform: `translateY(${swipeDeltaY}px)` } : {}"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 顶栏 -->
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <span class="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
          {{ selectedPhoto ? 'Photo' : 'Place' }}
        </span>
        <button
          type="button"
          class="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          @click="$emit('close')"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- 照片详情 -->
      <div v-if="selectedPhoto" class="flex-1 overflow-y-auto p-5">
        <img
          :src="selectedPhoto.src"
          :alt="selectedPhoto.caption ?? ''"
          class="mb-4 w-full rounded-2xl"
        />

        <p v-if="selectedPhoto.caption" class="text-base font-medium text-foreground">{{ selectedPhoto.caption }}</p>

        <div class="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <p v-if="selectedPhoto.date" class="flex items-center gap-2">
            <Calendar :size="14" />
            {{ formatDate(selectedPhoto.date) }}
          </p>
          <p v-if="selectedPhoto.location?.name" class="flex items-center gap-2">
            <MapPin :size="14" />
            {{ selectedPhoto.location.name }}
          </p>
        </div>

        <!-- 关联链接 -->
        <div class="mt-5 flex flex-wrap gap-2">
          <router-link
            v-if="photoStage"
            :to="`/stage/${photoStage.id}`"
            class="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            @click="$emit('close')"
          >
            <ArrowLeft :size="12" /> {{ photoStage.name }}
          </router-link>
          <router-link
            v-if="photoAlbum"
            :to="`/album/${photoAlbum.id}`"
            class="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            @click="$emit('close')"
          >
            <ArrowLeft :size="12" /> {{ photoAlbum.title }}
          </router-link>
        </div>
      </div>

      <!-- 地点详情 -->
      <div v-else-if="selectedPlace" class="flex-1 overflow-y-auto p-5">
        <h3 class="font-display text-2xl font-semibold text-foreground">{{ selectedPlace.name }}</h3>

        <div class="mt-2 text-sm text-muted-foreground">
          <p v-if="selectedPlace.location" class="flex items-center gap-2">
            <MapPin :size="14" />
            {{ selectedPlace.location.latitude.toFixed(4) }}, {{ selectedPlace.location.longitude.toFixed(4) }}
          </p>
        </div>

        <!-- 关联阶段 -->
        <div v-if="placeStages.length > 0" class="mt-6">
          <p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">关联阶段</p>
          <div class="flex flex-wrap gap-2">
            <router-link
              v-for="stage in placeStages"
              :key="stage.id"
              :to="`/stage/${stage.id}`"
              class="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              @click="$emit('close')"
            >
              {{ stage.name }}
            </router-link>
          </div>
        </div>

        <!-- 地点照片 -->
        <div v-if="selectedPlace.photoIds && selectedPlace.photoIds.length > 0" class="mt-6">
          <p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            照片 ({{ selectedPlace.photoIds.length }})
          </p>
          <div class="grid grid-cols-3 gap-2">
            <img
              v-for="pid in selectedPlace.photoIds"
              :key="pid"
              :src="data.getPhoto(pid)?.thumbnail ?? data.getPhoto(pid)?.src ?? ''"
              :alt="data.getPhoto(pid)?.caption ?? ''"
              class="aspect-square w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay-slide-enter-active,
.overlay-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.overlay-slide-enter-from,
.overlay-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
