<script setup lang="ts">
/**
 * StageList —— 时间轴左侧阶段列表
 *
 * 接收全部阶段与排序方式，内部排序后渲染；高亮当前选中阶段，
 * 点击触发 select 事件。用于 TimelineView 左栏。
 */
import { computed } from 'vue'
import type { Stage } from '@/types'
import type { SortOrder } from '@/stores/uiStore'
import { formatDateRange } from '@/utils/dateUtils'

const props = defineProps<{
  stages: Stage[]
  activeId?: string
  sortOrder?: SortOrder
}>()

const emit = defineEmits<{ (e: 'select', stage: Stage): void }>()

const sorted = computed<Stage[]>(() => {
  const list = [...props.stages]
  const order = props.sortOrder ?? 'chronological'
  if (order === 'alphabetical') {
    list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  } else {
    list.sort((a, b) => a.startDate.localeCompare(b.startDate))
  }
  return list
})

function onSelect(stage: Stage) {
  emit('select', stage)
}
</script>

<template>
  <nav class="flex flex-col gap-1">
    <button
      v-for="stage in sorted"
      :key="stage.id"
      type="button"
      class="group relative w-full rounded-xl border border-transparent px-4 py-3 text-left transition-all duration-200"
      :class="
        stage.id === activeId
          ? 'bg-secondary text-foreground shadow-sm'
          : 'hover:border-border hover:bg-secondary/40'
      "
      @click="onSelect(stage)"
    >
      <div class="flex items-baseline justify-between gap-2">
        <p class="text-sm font-medium text-foreground">
          {{ stage.name }}
        </p>
        <span class="shrink-0 text-[10px] tracking-wider text-muted-foreground">
          {{ formatDateRange(stage.startDate, stage.endDate) }}
        </span>
      </div>

      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="tag in (stage.tags ?? []).slice(0, 3)"
          :key="tag"
          class="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
        >{{ tag }}</span>
      </div>

      <span
        class="mt-2 block h-1 w-8 rounded-full opacity-60"
        :style="{ backgroundColor: stage.themeColor }"
      />
    </button>
  </nav>
</template>
