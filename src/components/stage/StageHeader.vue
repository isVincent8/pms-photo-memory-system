<script setup lang="ts">
/**
 * StageHeader —— 阶段头部（封面 + 时间 + 标题 + 标签）
 *
 * 复用于 StageView 与 TimelineView 右侧预览。有封面时叠加渐变与标题；
 * 无封面时使用纯排版头部。
 */
import type { Stage } from '@/types'
import { formatDateRange } from '@/utils/dateUtils'

defineProps<{
  stage: Stage
  /** 是否展示为紧凑模式（右侧预览用） */
  compact?: boolean
}>()
</script>

<template>
  <div v-if="stage.cover" class="relative mb-10 overflow-hidden rounded-2xl">
    <img
      :src="stage.cover"
      :alt="stage.name"
      class="w-full object-cover"
      :class="compact ? 'h-48 md:h-64' : 'h-64 md:h-96'"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
    <div class="absolute bottom-0 left-0 p-6 md:p-10">
      <span
        class="inline-block rounded-full bg-background/80 px-3 py-1 text-xs font-medium tracking-wider text-primary backdrop-blur-sm"
        :style="{ color: stage.themeColor }"
      >
        {{ formatDateRange(stage.startDate, stage.endDate) }}
      </span>
      <h1
        class="mt-3 font-display font-semibold tracking-tight text-foreground"
        :class="compact ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'"
      >
        {{ stage.name }}
      </h1>
    </div>
  </div>

  <header v-else class="mb-10">
    <span
      class="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wider text-primary"
      :style="{ color: stage.themeColor }"
    >
      {{ formatDateRange(stage.startDate, stage.endDate) }}
    </span>
    <h1
      class="mt-3 font-display font-semibold tracking-tight text-foreground"
      :class="compact ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'"
    >
      {{ stage.name }}
    </h1>
  </header>
</template>
