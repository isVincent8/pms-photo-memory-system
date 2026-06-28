<script setup lang="ts">
/**
 * MapTooltip —— 地图悬停提示
 *
 * 跟随鼠标位置展示的信息卡片：照片含缩略图、标题、日期、地点、关联阶段/相册；
 * 地点显示名称；聚类显示照片数量。
 */
import { formatDate } from '@/utils/dateUtils'
import { MapPin, Calendar, Images, MapPinned } from 'lucide-vue-next'

export interface MapTooltipData {
  x: number
  y: number
  kind: 'photo' | 'place' | 'cluster'
  title: string
  thumbnail?: string
  date?: string | null
  locationName?: string
  stageName?: string
  albumName?: string
  count?: number
}

defineProps<{
  hover: MapTooltipData | null
}>()
</script>

<template>
  <div
    v-if="hover"
    class="pointer-events-none absolute z-20 max-w-[220px] -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-card/95 p-2.5 text-xs text-foreground shadow-card backdrop-blur"
    :style="{ left: `${hover.x}px`, top: `${hover.y - 10}px` }"
  >
    <!-- 照片缩略图 -->
    <div
      v-if="hover.kind === 'photo' && hover.thumbnail"
      class="mb-2 overflow-hidden rounded-lg"
    >
      <img
        :src="hover.thumbnail"
        :alt="hover.title"
        class="h-24 w-full object-cover"
      />
    </div>

    <!-- 聚类数量徽章 -->
    <div
      v-else-if="hover.kind === 'cluster'"
      class="mb-1.5 flex items-center gap-2"
    >
      <span
        class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
      >
        {{ hover.count }}
      </span>
      <span class="font-medium">{{ hover.title }}</span>
    </div>

    <!-- 标题 -->
    <p class="mb-1 line-clamp-2 font-medium leading-tight">
      {{ hover.title }}
    </p>

    <!-- 照片元信息 -->
    <div v-if="hover.kind === 'photo'" class="space-y-0.5 text-[11px] text-muted-foreground">
      <p v-if="hover.date" class="flex items-center gap-1">
        <Calendar :size="11" />
        {{ formatDate(hover.date) }}
      </p>
      <p v-if="hover.locationName" class="flex items-center gap-1">
        <MapPin :size="11" />
        {{ hover.locationName }}
      </p>
      <p v-if="hover.stageName" class="flex items-center gap-1">
        <MapPinned :size="11" />
        {{ hover.stageName }}
      </p>
      <p v-if="hover.albumName" class="flex items-center gap-1">
        <Images :size="11" />
        {{ hover.albumName }}
      </p>
    </div>
  </div>
</template>
