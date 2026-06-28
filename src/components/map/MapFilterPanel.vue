<script setup lang="ts">
/**
 * MapFilterPanel —— 地图筛选面板
 *
 * 提供类型（全部 / 照片 / 地点）与所属阶段筛选，支持一键重置。
 */
import { computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { Filter, X } from 'lucide-vue-next'

export interface MapFilter {
  kind: 'all' | 'photo' | 'place'
  stageId: string | null
  albumId: string | null
}

const props = defineProps<{
  modelValue: MapFilter
}>()

const emit = defineEmits<{
  'update:modelValue': [filter: MapFilter]
}>()

const data = useDataStore()

const kindOptions: { key: MapFilter['kind']; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'photo', label: '照片' },
  { key: 'place', label: '地点' },
]

const sortedStages = computed(() =>
  [...data.stages].sort((a, b) => a.startDate.localeCompare(b.startDate)),
)

const sortedAlbums = computed(() =>
  [...data.albums].sort((a, b) => a.date.localeCompare(b.date)),
)

const hasFilter = computed(
  () =>
    props.modelValue.kind !== 'all' ||
    props.modelValue.stageId !== null ||
    props.modelValue.albumId !== null,
)

function setKind(kind: MapFilter['kind']) {
  emit('update:modelValue', { ...props.modelValue, kind })
}

function setStage(stageId: string | null) {
  emit('update:modelValue', { ...props.modelValue, stageId })
}

function setAlbum(albumId: string | null) {
  emit('update:modelValue', { ...props.modelValue, albumId })
}

function reset() {
  emit('update:modelValue', { kind: 'all', stageId: null, albumId: null })
}
</script>

<template>
  <div
    class="pointer-events-auto absolute left-4 top-4 z-10 w-56 rounded-xl border border-border bg-card/95 p-3 shadow-card backdrop-blur-xl"
  >
    <div class="mb-2.5 flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Filter :size="14" />
        地图筛选
      </div>
      <button
        v-if="hasFilter"
        type="button"
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        @click="reset"
      >
        <X :size="10" />
        重置
      </button>
    </div>

    <!-- 类型筛选 -->
    <div class="mb-3 flex rounded-lg border border-border p-0.5">
      <button
        v-for="opt in kindOptions"
        :key="opt.key"
        type="button"
        class="flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
        :class="
          modelValue.kind === opt.key
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="setKind(opt.key)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- 阶段筛选 -->
    <label class="block text-[11px] text-muted-foreground">所属阶段</label>
    <select
      :value="modelValue.stageId ?? ''"
      class="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
      @change="setStage(($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">全部阶段</option>
      <option
        v-for="stage in sortedStages"
        :key="stage.id"
        :value="stage.id"
      >
        {{ stage.name }}
      </option>
    </select>

    <!-- 相册筛选 -->
    <label class="mt-3 block text-[11px] text-muted-foreground">所属相册</label>
    <select
      :value="modelValue.albumId ?? ''"
      class="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
      @change="setAlbum(($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">全部相册</option>
      <option
        v-for="album in sortedAlbums"
        :key="album.id"
        :value="album.id"
      >
        {{ album.title }}
      </option>
    </select>
  </div>
</template>
