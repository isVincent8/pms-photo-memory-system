<script setup lang="ts">
/**
 * StageView —— 单阶段详情（全宽）
 *
 * 顶部 StageHeader（封面 + 时间 + 标题），其下为 Markdown 故事、
 * 关联相册 / 人物 / 地点 / 标签，以及照片网格。照片点击打开 Lightbox。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { useMarkdownContent } from '@/composables/useMarkdownContent'
import type { Photo } from '@/types'
import StageHeader from '@/components/stage/StageHeader.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ViewSwitcher from '@/components/ViewSwitcher.vue'
import StoryMode from '@/components/StoryMode.vue'
import AlbumEditor from '@/components/album/AlbumEditor.vue'
import ExportPanel from '@/components/ExportPanel.vue'
import { ChevronLeft, ChevronRight, Pencil, Plus, Download } from 'lucide-vue-next'

const props = defineProps<{ id: string }>()
const data = useDataStore()
const ui = useUiStore()

onMounted(() => {
  if (!data.loaded) data.load()
  ui.currentStageId = props.id
})

watch(
  () => props.id,
  (id) => {
    ui.currentStageId = id
  },
)

const stage = computed(() => data.getStage(props.id))
const { markdown } = useMarkdownContent(computed(() => stage.value?.content))
const photos = computed<Photo[]>(() => data.photos.filter((p) => p.stageId === props.id))

const albums = computed(() =>
  (stage.value?.albumIds ?? [])
    .map((aid) => data.getAlbum(aid))
    .filter((a): a is NonNullable<typeof a> => Boolean(a)),
)

const people = computed(() =>
  (stage.value?.people ?? [])
    .map((pid) => data.people.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p)),
)

const places = computed(() =>
  (stage.value?.locations ?? [])
    .map((name) => data.places.find((p) => p.name === name))
    .filter((p): p is NonNullable<typeof p> => Boolean(p)),
)

const tags = computed(() => stage.value?.tags ?? [])

const sortedStages = computed(() =>
  [...data.stages].sort((a, b) => a.startDate.localeCompare(b.startDate)),
)

const stageIndex = computed(() =>
  sortedStages.value.findIndex((s) => s.id === props.id),
)

const prevStage = computed(() =>
  stageIndex.value > 0 ? sortedStages.value[stageIndex.value - 1] : undefined,
)

const nextStage = computed(() =>
  stageIndex.value >= 0 && stageIndex.value < sortedStages.value.length - 1
    ? sortedStages.value[stageIndex.value + 1]
    : undefined,
)

const photoViewMode = computed({
  get: () => ui.settings.photoViewMode,
  set: (mode) => ui.updateSettings({ photoViewMode: mode }),
})

const storyModeOpen = ref(false)
const selecting = ref(false)
const selectedPhotoIds = ref<string[]>([])
const albumEditorOpen = ref(false)
const editingAlbumId = ref<string | undefined>(undefined)
const exportPanelOpen = ref(false)

function onPhotoSelect({ index }: { photo: Photo; index: number }) {
  ui.openLightbox(photos.value, index)
}

function openStoryMode() {
  if (photos.value.length === 0) return
  storyModeOpen.value = true
}

function toggleSelecting() {
  selecting.value = !selecting.value
  selectedPhotoIds.value = []
}

function createStoryFromSelection() {
  if (selectedPhotoIds.value.length === 0) return
  editingAlbumId.value = undefined
  albumEditorOpen.value = true
}

function editAlbum(id: string) {
  editingAlbumId.value = id
  albumEditorOpen.value = true
}

function onAlbumEditorSaved() {
  albumEditorOpen.value = false
  editingAlbumId.value = undefined
  selecting.value = false
  selectedPhotoIds.value = []
}

</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-14">
    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="space-y-4">
      <div class="h-72 animate-pulse rounded-xl bg-secondary" />
      <div class="h-4 w-2/3 animate-pulse rounded bg-secondary" />
      <div class="h-4 w-1/2 animate-pulse rounded bg-secondary" />
    </div>

    <template v-else-if="stage">
      <div class="mb-6 flex items-start justify-between gap-4">
        <StageHeader :stage="stage" class="flex-1" />
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
          @click="exportPanelOpen = true"
        >
          <Download :size="14" /> 导出
        </button>
      </div>

      <!-- Markdown 故事 -->
      <section v-if="markdown" class="mb-14">
        <MarkdownRenderer :content="markdown" />
      </section>

      <!-- 关联信息 -->
      <div class="mb-12 grid gap-6 md:grid-cols-2">
        <section v-if="albums.length > 0" class="surface p-5">
          <h2 class="mb-3 font-display text-sm tracking-wide text-muted-foreground">关联故事</h2>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="album in albums"
              :key="album.id"
              class="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary"
            >
              <router-link
                :to="`/album/${album.id}`"
                class="text-foreground transition-colors hover:text-primary"
              >
                {{ album.title }}
              </router-link>
              <button
                type="button"
                class="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                @click="editAlbum(album.id)"
              >
                <Pencil :size="10" />
              </button>
            </div>
          </div>
        </section>

        <section v-if="people.length > 0" class="surface p-5">
          <h2 class="mb-3 font-display text-sm tracking-wide text-muted-foreground">人物</h2>
          <div class="flex flex-wrap gap-2">
            <router-link
              v-for="person in people"
              :key="person.id"
              :to="`/person/${person.id}`"
              class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <img
                v-if="person.avatar"
                :src="person.avatar"
                :alt="person.name"
                class="h-5 w-5 rounded-full object-cover"
              />
              {{ person.name }}
            </router-link>
          </div>
        </section>

        <section v-if="places.length > 0" class="surface p-5">
          <h2 class="mb-3 font-display text-sm tracking-wide text-muted-foreground">地点</h2>
          <div class="flex flex-wrap gap-2">
            <router-link
              v-for="place in places"
              :key="place.id"
              :to="`/place/${place.id}`"
              class="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {{ place.name }}
            </router-link>
          </div>
        </section>

        <section v-if="tags.length > 0" class="surface p-5">
          <h2 class="mb-3 font-display text-sm tracking-wide text-muted-foreground">标签</h2>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in tags"
              :key="tag"
              class="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
            >
              {{ tag }}
            </span>
          </div>
        </section>
      </div>

      <!-- 照片网格 -->
      <section v-if="photos.length > 0">
        <div class="mb-5 flex items-center gap-3">
          <h2 class="font-display text-lg font-semibold text-foreground">照片</h2>
          <span class="text-xs text-muted-foreground">{{ photos.length }} 张</span>
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
              <Plus :size="14" /> 选择照片建故事
            </button>
            <ViewSwitcher v-model="photoViewMode" @slideshow="openStoryMode" />
          </template>
        </div>
        <PhotoGrid
          :photos="photos"
          :mode="photoViewMode"
          :selectable="selecting"
          :selected-ids="selectedPhotoIds"
          @select="onPhotoSelect"
          @update:selected-ids="selectedPhotoIds = $event"
        />
      </section>

      <StoryMode
        v-if="storyModeOpen"
        :photos="photos"
        @close="storyModeOpen = false"
      />

      <AlbumEditor
        v-if="albumEditorOpen"
        :album-id="editingAlbumId"
        :initial-photo-ids="editingAlbumId ? undefined : selectedPhotoIds"
        :initial-stage-id="stage?.id"
        @close="albumEditorOpen = false"
        @saved="onAlbumEditorSaved"
        @deleted="onAlbumEditorSaved"
      />

      <ExportPanel
        v-if="exportPanelOpen"
        :photos="photos"
        :title="stage.name"
        :subtitle="`${photos.length} 张照片`"
        @close="exportPanelOpen = false"
      />

      <div v-else class="py-8 text-center text-sm text-muted-foreground">该阶段暂无照片</div>

      <!-- 上一个 / 下一个阶段 -->
      <nav class="mt-14 flex items-center justify-between border-t border-border pt-6">
        <router-link
          v-if="prevStage"
          :to="`/stage/${prevStage.id}`"
          class="group flex max-w-[45%] items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft :size="18" class="shrink-0 transition-transform group-hover:-translate-x-1" />
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">上一个阶段</p>
            <p class="truncate font-medium text-foreground">{{ prevStage.name }}</p>
          </div>
        </router-link>
        <span v-else />

        <router-link
          v-if="nextStage"
          :to="`/stage/${nextStage.id}`"
          class="group flex max-w-[45%] items-center gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">下一个阶段</p>
            <p class="truncate font-medium text-foreground">{{ nextStage.name }}</p>
          </div>
          <ChevronRight :size="18" class="shrink-0 transition-transform group-hover:translate-x-1" />
        </router-link>
        <span v-else />
      </nav>
    </template>

    <!-- 未找到 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">未找到该阶段</p>
      <router-link
        to="/timeline"
        class="mt-4 inline-block text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        ← 返回时间轴
      </router-link>
    </div>
  </div>
</template>
