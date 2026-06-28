<script setup lang="ts">
/**
 * AlbumView —— 相册页（全宽瀑布流）
 *
 * 顶部相册信息（标题 / 时间 / 地点 / 所属阶段），其下为 PhotoGrid
 * 网格 / 瀑布流，可通过 ViewSwitcher 切换；点击打开 Lightbox，
 * 幻灯片按钮进入 StoryMode。支持键盘 ← → / Esc 切换（由全局 Lightbox 组件处理）。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { useMarkdownContent } from '@/composables/useMarkdownContent'
import type { Photo } from '@/types'
import { formatDate } from '@/utils/dateUtils'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ViewSwitcher from '@/components/ViewSwitcher.vue'
import StoryMode from '@/components/StoryMode.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import ExportMenu from '@/components/ExportMenu.vue'
import { exportAlbumMarkdown, exportAlbumJson } from '@/utils/exportUtils'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{ id: string }>()
const data = useDataStore()
const ui = useUiStore()

onMounted(() => {
  if (!data.loaded) data.load()
  ui.currentAlbumId = props.id
})

watch(
  () => props.id,
  (id) => {
    ui.currentAlbumId = id
  },
)

const album = computed(() => data.getAlbum(props.id))
const { markdown: albumMarkdown } = useMarkdownContent(computed(() => album.value?.content))
const photos = computed<Photo[]>(() => data.photos.filter((p) => p.albumId === props.id))
const stage = computed(() => {
  const sid = album.value?.stageId
  return sid ? data.getStage(sid) : undefined
})
const stageName = computed(() => stage.value?.name)

const sortedAlbums = computed(() =>
  [...data.albums].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
)

const albumIndex = computed(() =>
  sortedAlbums.value.findIndex((a) => a.id === props.id),
)

const prevAlbum = computed(() =>
  albumIndex.value > 0 ? sortedAlbums.value[albumIndex.value - 1] : undefined,
)

const nextAlbum = computed(() =>
  albumIndex.value >= 0 && albumIndex.value < sortedAlbums.value.length - 1
    ? sortedAlbums.value[albumIndex.value + 1]
    : undefined,
)

const photoViewMode = computed({
  get: () => ui.settings.photoViewMode,
  set: (mode) => ui.updateSettings({ photoViewMode: mode }),
})

const storyModeOpen = ref(false)

function onSelect({ index }: { photo: Photo; index: number }) {
  ui.openLightbox(photos.value, index)
}

function openStoryMode() {
  if (photos.value.length === 0) return
  storyModeOpen.value = true
}

function onExport(key: string) {
  if (!album.value) return
  const ctx = { album: album.value, photos: photos.value, stage: stage.value }
  if (key === 'markdown') exportAlbumMarkdown(ctx)
  else if (key === 'json') exportAlbumJson(ctx)
  else if (key === 'print') window.print()
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="space-y-4">
      <div class="h-8 w-1/3 animate-pulse rounded bg-secondary" />
      <div class="grid grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="h-40 animate-pulse rounded-2xl bg-secondary" />
      </div>
    </div>

    <template v-else-if="album">
      <header class="mb-10 animate-rise">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <router-link
            v-if="album.stageId"
            :to="`/stage/${album.stageId}`"
            class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 transition-colors hover:bg-secondary/80"
          >
            ← {{ stageName ?? '所属阶段' }}
          </router-link>
          <span v-if="album.date">{{ formatDate(album.date) }}</span>
          <span v-if="album.location?.name">· {{ album.location.name }}</span>
        </div>
        <div class="flex items-start justify-between gap-4">
          <h1 class="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            {{ album.title }}
          </h1>
          <ExportMenu class="mt-4" @select="onExport" />
        </div>
        <p v-if="photos.length" class="mt-2 text-sm text-muted-foreground">
          共 {{ photos.length }} 张照片
        </p>
      </header>

      <!-- 相册故事 -->
      <section v-if="albumMarkdown" class="mb-10">
        <MarkdownRenderer :content="albumMarkdown" />
      </section>

      <!-- 照片网格 / 瀑布流 -->
      <template v-if="photos.length > 0">
        <div class="mb-5 flex items-center justify-end">
          <ViewSwitcher v-model="photoViewMode" @slideshow="openStoryMode" />
        </div>
        <PhotoGrid :photos="photos" :mode="photoViewMode" @select="onSelect" />
      </template>

      <StoryMode
        v-if="storyModeOpen"
        :photos="photos"
        @close="storyModeOpen = false"
      />

      <div v-else class="py-16 text-center text-sm text-muted-foreground">该相册暂无照片</div>

      <!-- 上一个 / 下一个相册 -->
      <nav class="mt-14 flex items-center justify-between border-t border-border pt-6">
        <router-link
          v-if="prevAlbum"
          :to="`/album/${prevAlbum.id}`"
          class="group flex max-w-[45%] items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft :size="18" class="shrink-0 transition-transform group-hover:-translate-x-1" />
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">上一个相册</p>
            <p class="truncate font-medium text-foreground">{{ prevAlbum.title }}</p>
          </div>
        </router-link>
        <span v-else />

        <router-link
          v-if="nextAlbum"
          :to="`/album/${nextAlbum.id}`"
          class="group flex max-w-[45%] items-center gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">下一个相册</p>
            <p class="truncate font-medium text-foreground">{{ nextAlbum.title }}</p>
          </div>
          <ChevronRight :size="18" class="shrink-0 transition-transform group-hover:translate-x-1" />
        </router-link>
        <span v-else />
      </nav>
    </template>

    <!-- 未找到 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">未找到该相册</p>
      <router-link
        to="/timeline"
        class="mt-4 inline-block text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        ← 返回时间轴
      </router-link>
    </div>
  </div>
</template>
