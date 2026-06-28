<script setup lang="ts">
/**
 * TimelineChrono —— 按年月日组织的时间轴
 *
 * 将所有照片按日期倒序排列，并以“年 / 月 / 日”层级分组展示。
 * 点击照片触发 select 事件，由父级打开 Lightbox。
 */
import { computed } from 'vue'
import type { Photo } from '@/types'
import { useDataStore } from '@/stores/dataStore'
import { formatDate } from '@/utils/dateUtils'
import LazyImage from '@/components/LazyImage.vue'
import { Download } from 'lucide-vue-next'
import { formatYearMonth } from '@/utils/dateUtils'

const props = withDefaults(
  defineProps<{
    photos: Photo[]
    exportable?: boolean
  }>(),
  { exportable: false },
)

const emit = defineEmits<{
  (e: 'select', payload: { photo: Photo; index: number }): void
  (e: 'export', payload: { photos: Photo[]; title: string; subtitle?: string }): void
}>()

const data = useDataStore()

interface DayGroup {
  day: string
  photos: Photo[]
}

interface MonthGroup {
  month: string
  days: DayGroup[]
}

interface YearGroup {
  year: string
  months: MonthGroup[]
}

const groups = computed<YearGroup[]>(() => {
  const sorted = [...props.photos]
    .filter((p) => p.date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const yearMap = new Map<string, Map<string, Map<string, Photo[]>>>()

  for (const photo of sorted) {
    const date = photo.date! // filtered above
    const [year, month, day] = date.split('-')
    if (!yearMap.has(year)) yearMap.set(year, new Map())
    const monthMap = yearMap.get(year)!
    if (!monthMap.has(month)) monthMap.set(month, new Map())
    const dayMap = monthMap.get(month)!
    if (!dayMap.has(day)) dayMap.set(day, [])
    dayMap.get(day)!.push(photo)
  }

  return Array.from(yearMap.entries()).map(([year, monthMap]) => ({
    year,
    months: Array.from(monthMap.entries()).map(([month, dayMap]) => ({
      month,
      days: Array.from(dayMap.entries()).map(([day, photos]) => ({
        day,
        photos,
      })),
    })),
  }))
})

const flatPhotos = computed(() => props.photos.filter((p) => p.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')))

function findIndex(photo: Photo): number {
  return flatPhotos.value.findIndex((p) => p.id === photo.id)
}

function onSelect(photo: Photo) {
  emit('select', { photo, index: findIndex(photo) })
}

function stageName(stageId?: string): string | undefined {
  return stageId ? data.getStage(stageId)?.name : undefined
}

function monthLabel(month: string): string {
  return `${parseInt(month, 10)} 月`
}

function exportYear(year: string, photos: Photo[]) {
  emit('export', {
    photos,
    title: `${year} 年照片`,
    subtitle: `共 ${photos.length} 张`,
  })
}

function exportMonth(year: string, month: string, photos: Photo[]) {
  emit('export', {
    photos,
    title: formatYearMonth(`${year}-${month}-01`),
    subtitle: `共 ${photos.length} 张`,
  })
}
</script>

<template>
  <div v-if="groups.length === 0" class="py-24 text-center text-sm text-muted-foreground">
    暂无带日期的照片
  </div>

  <div v-else class="relative pl-6 md:pl-10">
    <!-- 垂直中线 -->
    <div class="absolute left-2 top-0 bottom-0 w-px bg-border md:left-4" />

    <section
      v-for="yearGroup in groups"
      :key="yearGroup.year"
      class="mb-10"
    >
      <!-- 年份标记 -->
      <div class="relative mb-6 flex items-center justify-between">
        <div class="flex items-center">
          <span class="absolute left-[-18px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground md:left-[-26px]">
            {{ yearGroup.year.slice(2) }}
          </span>
          <h2 class="font-display text-2xl font-semibold text-foreground">
            {{ yearGroup.year }}
          </h2>
        </div>
        <button
          v-if="exportable"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-foreground transition-colors hover:border-primary hover:text-primary"
          @click="exportYear(yearGroup.year, yearGroup.months.flatMap((m) => m.days.flatMap((d) => d.photos)))"
        >
          <Download :size="12" /> 导出全年
        </button>
      </div>

      <div
        v-for="monthGroup in yearGroup.months"
        :key="`${yearGroup.year}-${monthGroup.month}`"
        class="mb-8"
      >
        <!-- 月份标记 -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-medium text-muted-foreground">
            {{ monthLabel(monthGroup.month) }}
          </h3>
          <button
            v-if="exportable"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            @click="exportMonth(yearGroup.year, monthGroup.month, monthGroup.days.flatMap((d) => d.photos))"
          >
            <Download :size="12" /> 导出本月
          </button>
        </div>

        <div
          v-for="dayGroup in monthGroup.days"
          :key="`${yearGroup.year}-${monthGroup.month}-${dayGroup.day}`"
          class="mb-6"
        >
          <!-- 日期标记 -->
          <div class="relative mb-3 flex items-center gap-3">
            <span class="absolute left-[-14px] h-2 w-2 rounded-full bg-secondary md:left-[-22px]" />
            <span class="text-xs font-medium text-foreground">
              {{ parseInt(dayGroup.day, 10) }} 日
            </span>
            <span class="text-xs text-muted-foreground">
              {{ formatDate(`${yearGroup.year}-${monthGroup.month}-${dayGroup.day}`) }}
            </span>
          </div>

          <!-- 照片网格 -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <button
              v-for="photo in dayGroup.photos"
              :key="photo.id"
              type="button"
              class="group relative overflow-hidden rounded-2xl bg-secondary text-left transition hover:shadow-card-hover"
              @click="onSelect(photo)"
            >
              <LazyImage
                :src="photo.thumbnail || photo.src"
                :alt="photo.caption || ''"
                :aspect-ratio="1.2"
                class="h-full w-full"
              />
              <div
                class="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/90 via-background/20 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <p v-if="photo.caption" class="line-clamp-2 text-[11px] font-medium text-foreground">
                  {{ photo.caption }}
                </p>
                <p v-if="stageName(photo.stageId)" class="mt-0.5 text-[10px] text-muted-foreground">
                  {{ stageName(photo.stageId) }}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
