<script setup lang="ts">
/**
 * TimelineView —— 时间轴总览（左右分栏）
 *
 * 左：阶段列表（StageList），支持按时间 / 字母排序，点击切换右侧内容。
 * 右：选中阶段的内容预览（StageHeader + MarkdownRenderer + PhotoGrid），
 *     并提供「查看完整阶段」入口跳转 /stage/:id。
 *
 * - 阶段切换时保存 / 恢复右侧滚动位置（按 stageId 记忆）。
 * - 桌面端（≥768px）双栏；移动端（<768px）阶段列表收为可折叠抽屉。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { useMarkdownContent } from '@/composables/useMarkdownContent'
import type { SortOrder } from '@/stores/uiStore'
import type { Photo, Stage } from '@/types'
import StageList from '@/components/timeline/StageList.vue'
import TimelineChrono from '@/components/timeline/TimelineChrono.vue'
import StageHeader from '@/components/stage/StageHeader.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import AlbumEditor from '@/components/album/AlbumEditor.vue'
import ExportPanel from '@/components/ExportPanel.vue'
import { Plus } from 'lucide-vue-next'

const data = useDataStore()
const ui = useUiStore()

type TimelineMode = 'time' | 'stage'

const viewMode = ref<TimelineMode>('time')
const sortOrder = ref<SortOrder>('chronological')
const selectedId = ref<string | null>(null)
const drawerOpen = ref(false)

const modeOptions: { key: TimelineMode; label: string }[] = [
  { key: 'time', label: '按年月日' },
  { key: 'stage', label: '按阶段' },
]

const sortModes: { key: SortOrder; label: string }[] = [
  { key: 'chronological', label: '按时间' },
  { key: 'alphabetical', label: '按字母' },
]

const rightPane = ref<HTMLElement | null>(null)
// 每个阶段的滚动位置记忆
const scrollMemory = new Map<string, number>()

const selecting = ref(false)
const selectedPhotoIds = ref<string[]>([])
const albumEditorOpen = ref(false)
const exportPanelOpen = ref(false)
const exportContext = ref<{ photos: Photo[]; title: string; subtitle?: string } | null>(null)

onMounted(() => {
  if (!data.loaded) data.load()
  drawerOpen.value = window.innerWidth >= 768
})

function toggleSelecting() {
  selecting.value = !selecting.value
  selectedPhotoIds.value = []
}

function createStoryFromSelection() {
  if (selectedPhotoIds.value.length === 0 || !activeStage.value) return
  albumEditorOpen.value = true
}

function onAlbumEditorSaved() {
  albumEditorOpen.value = false
  selecting.value = false
  selectedPhotoIds.value = []
}

// 默认选中第一个阶段
watch(
  () => data.stages,
  (list) => {
    if (!selectedId.value && list.length > 0) {
      const sorted = [...list].sort((a, b) => a.startDate.localeCompare(b.startDate))
      selectedId.value = sorted[0].id
    }
  },
  { immediate: true },
)

const activeStage = computed<Stage | undefined>(() =>
  selectedId.value ? data.getStage(selectedId.value) : undefined,
)

const { markdown: stageMarkdown } = useMarkdownContent(computed(() => activeStage.value?.content))

const stagePhotos = computed<Photo[]>(() =>
  selectedId.value ? data.photos.filter((p) => p.stageId === selectedId.value) : [],
)

function onSelectStage(stage: Stage) {
  // 保存当前滚动位置
  if (selectedId.value && rightPane.value) {
    scrollMemory.set(selectedId.value, rightPane.value.scrollTop)
  }
  selectedId.value = stage.id
  ui.currentStageId = stage.id
  // 移动端选择后收起抽屉
  if (window.innerWidth < 768) drawerOpen.value = false
  // 恢复目标阶段滚动位置
  nextTick(() => {
    if (rightPane.value) rightPane.value.scrollTop = scrollMemory.get(stage.id) ?? 0
  })
}

function onPhotoSelect({ index }: { photo: Photo; index: number }) {
  ui.openLightbox(stagePhotos.value, index)
}

watch([() => selectedId.value, viewMode], () => {
  selecting.value = false
  selectedPhotoIds.value = []
})

function onChronoSelect({ index }: { photo: Photo; index: number }) {
  const datedPhotos = data.photos
    .filter((p) => p.date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  ui.openLightbox(datedPhotos, index)
}

function onChronoExport(ctx: { photos: Photo[]; title: string; subtitle?: string }) {
  exportContext.value = ctx
  exportPanelOpen.value = true
}
</script>

<template>
  <div class="flex h-full">
    <!-- 移动端抽屉遮罩 -->
    <Transition name="overlay">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-sm md:hidden"
        @click="drawerOpen = false"
      />
    </Transition>

    <!-- 左侧阶段列表（仅在按阶段模式下显示） -->
    <aside
      v-if="viewMode === 'stage'"
      class="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-background transition-transform duration-300 md:relative md:translate-x-0"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center justify-between px-5 pb-2 pt-8">
        <p class="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Life Stages</p>
        <span class="text-[10px] text-muted-foreground">{{ data.stages.length }}</span>
      </div>

      <!-- 排序切换 -->
      <div class="flex gap-2 px-5 pb-3">
        <button
          v-for="opt in sortModes"
          :key="opt.key"
          type="button"
          class="rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200"
          :class="
            sortOrder === opt.key
              ? 'bg-foreground text-background'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          "
          @click="sortOrder = opt.key"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-6">
        <StageList
          :stages="data.stages"
          :active-id="selectedId ?? undefined"
          :sort-order="sortOrder"
          @select="onSelectStage"
        />
      </div>
    </aside>

    <!-- 右侧内容 -->
    <main
      ref="rightPane"
      class="flex-1 overflow-y-auto bg-background"
    >
      <!-- 顶部模式切换 -->
      <div class="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div class="flex gap-2">
          <button
            v-for="opt in modeOptions"
            :key="opt.key"
            type="button"
            class="rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200"
            :class="
              viewMode === opt.key
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            "
            @click="viewMode = opt.key"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- 移动端打开阶段列表按钮 -->
        <button
          v-if="viewMode === 'stage'"
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary md:hidden"
          @click="drawerOpen = true"
        >
          阶段列表
        </button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="!data.loaded" class="space-y-4 p-6 md:p-10">
        <div class="h-64 animate-pulse rounded-2xl bg-secondary" />
        <div class="h-4 w-2/3 animate-pulse rounded bg-secondary" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-secondary" />
      </div>

      <!-- 按年月日模式 -->
      <section v-else-if="viewMode === 'time'" class="px-5 py-6 md:px-10">
        <TimelineChrono :photos="data.photos" exportable @select="onChronoSelect" @export="onChronoExport" />
      </section>

      <!-- 按阶段模式：选中阶段内容 -->
      <article v-else-if="activeStage" class="px-6 pb-16 pt-2 md:px-10">
        <StageHeader :stage="activeStage" compact />

        <section v-if="stageMarkdown" class="mb-10">
          <MarkdownRenderer :content="stageMarkdown" />
        </section>

        <section v-if="stagePhotos.length > 0">
          <div class="mb-5 flex items-center gap-3">
            <h2 class="font-display text-xl font-semibold text-foreground">照片</h2>
            <span class="text-xs text-muted-foreground">{{ stagePhotos.length }} 张</span>
            <span class="h-px flex-1 bg-border" />
            <template v-if="selecting">
              <span class="text-xs text-muted-foreground">已选 {{ selectedPhotoIds.length }} 张</span>
              <button
                type="button"
                :disabled="selectedPhotoIds.length === 0"
                class="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                @click="createStoryFromSelection"
              >
                <Plus :size="14" /> 创建故事
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                @click="toggleSelecting"
              >
                取消
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
                @click="toggleSelecting"
              >
                <Plus :size="14" /> 选择建故事
              </button>
              <router-link
                :to="`/stage/${activeStage.id}`"
                class="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                查看完整阶段 <span aria-hidden="true">→</span>
              </router-link>
            </template>
          </div>
          <PhotoGrid
            :photos="stagePhotos"
            :selectable="selecting"
            :selected-ids="selectedPhotoIds"
            @select="onPhotoSelect"
            @update:selected-ids="selectedPhotoIds = $event"
          />
        </section>

        <AlbumEditor
          v-if="albumEditorOpen"
          :initial-photo-ids="selectedPhotoIds"
          :initial-stage-id="activeStage?.id"
          @close="albumEditorOpen = false"
          @saved="onAlbumEditorSaved"
        />

        <div v-else class="py-8 text-center text-sm text-muted-foreground">该阶段暂无照片</div>
      </article>

      <!-- 空状态 -->
      <div v-else class="py-24 text-center">
        <p class="font-display text-sm text-muted-foreground">暂无阶段数据</p>
      </div>

      <ExportPanel
        v-if="exportPanelOpen && exportContext"
        :photos="exportContext.photos"
        :title="exportContext.title"
        :subtitle="exportContext.subtitle"
        @close="exportPanelOpen = false"
      />
    </main>
  </div>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
