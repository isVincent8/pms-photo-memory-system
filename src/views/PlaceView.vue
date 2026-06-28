<script setup lang="ts">
/**
 * PlaceView —— 地点详情页
 *
 * 展示地点名称、坐标、Markdown 故事、关联照片与阶段。
 */
import { computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { useMarkdownContent } from '@/composables/useMarkdownContent'
import { MapPin, ExternalLink } from 'lucide-vue-next'
import type { Photo, Stage } from '@/types'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const props = defineProps<{ id: string }>()
const data = useDataStore()
const ui = useUiStore()

onMounted(() => {
  if (!data.loaded) data.load()
})

const place = computed(() => data.places.find((p) => p.id === props.id))
const { markdown: placeMarkdown } = useMarkdownContent(computed(() => place.value?.content))

const photos = computed<Photo[]>(() =>
  data.photos.filter((p) => p.location?.name === place.value?.name),
)

const stages = computed<Stage[]>(() =>
  (place.value?.stageIds ?? [])
    .map((id) => data.getStage(id))
    .filter((s): s is Stage => Boolean(s)),
)

const mapUrl = computed(() => {
  if (!place.value) return ''
  const { latitude, longitude } = place.value.location
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
})

function openLightbox(index: number) {
  ui.openLightbox(photos.value, index)
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="space-y-4">
      <div class="h-48 animate-pulse rounded-xl bg-secondary" />
      <div class="h-6 w-1/3 animate-pulse rounded bg-secondary" />
    </div>

    <template v-else-if="place">
      <header class="mb-10 animate-rise">
        <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Place</p>
        <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {{ place.name }}
        </h1>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1">
            <MapPin :size="12" />
            {{ place.location.latitude.toFixed(5) }}, {{ place.location.longitude.toFixed(5) }}
          </span>
          <a
            :href="mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
          >
            在地图上查看 <ExternalLink :size="10" />
          </a>
        </div>
      </header>

      <!-- 地点故事 -->
      <section v-if="placeMarkdown" class="mb-12">
        <div class="surface p-6">
          <MarkdownRenderer :content="placeMarkdown" />
        </div>
      </section>

      <!-- 关联阶段 -->
      <section v-if="stages.length > 0" class="mb-12">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">相关阶段</h2>
        <div class="flex flex-wrap gap-2">
          <router-link
            v-for="stage in stages"
            :key="stage.id"
            :to="`/stage/${stage.id}`"
            class="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {{ stage.name }}
          </router-link>
        </div>
      </section>

      <!-- 关联照片 -->
      <section v-if="photos.length > 0">
        <div class="mb-5 flex items-center gap-3">
          <h2 class="font-display text-xl font-semibold text-foreground">在这里拍摄的照片</h2>
          <span class="text-xs text-muted-foreground">{{ photos.length }} 张</span>
          <span class="h-px flex-1 bg-border" />
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <button
            v-for="(photo, idx) in photos"
            :key="photo.id"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
            @click="openLightbox(idx)"
          >
            <img
              v-if="photo.thumbnail || photo.src"
              :src="photo.thumbnail || photo.src"
              :alt="photo.caption || place.name"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              v-if="photo.caption"
              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <p class="line-clamp-2 text-left text-[10px] text-white">{{ photo.caption }}</p>
            </div>
          </button>
        </div>
      </section>

      <p v-else class="py-12 text-center text-sm text-muted-foreground">暂无关联照片</p>
    </template>

    <!-- 未找到 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">未找到该地点</p>
      <router-link
        to="/places"
        class="mt-4 inline-block text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        ← 返回地点列表
      </router-link>
    </div>
  </div>
</template>
