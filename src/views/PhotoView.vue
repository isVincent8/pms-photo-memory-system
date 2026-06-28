<script setup lang="ts">
/**
 * PhotoView —— 单张照片详情页
 *
 * 展示高清照片、说明文字、日期、地点、人物、所属相册与阶段，
 * 支持上一张 / 下一张导航，并可分享 URL。
 */
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { formatDate } from '@/utils/dateUtils'
import { downloadText } from '@/utils/exportUtils'
import {
  MapPin,
  Calendar,
  Users,
  FolderOpen,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Tag,
  Camera,
  Aperture,
  Gauge,
  Focus,
  Clock,
} from 'lucide-vue-next'

const props = defineProps<{ id: string }>()
const data = useDataStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (!data.loaded) data.load()
})

const photo = computed(() => data.photos.find((p) => p.id === props.id))

const collection = computed(() => {
  if (route.query.album) return data.photos.filter((p) => p.albumId === route.query.album)
  if (route.query.stage) return data.photos.filter((p) => p.stageId === route.query.stage)
  if (route.query.place) return data.photos.filter((p) => p.location?.name === route.query.place)
  return data.photos
})

const currentIndex = computed(() => collection.value.findIndex((p) => p.id === props.id))
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < collection.value.length - 1)

const prevPhoto = computed(() => (hasPrev.value ? collection.value[currentIndex.value - 1] : undefined))
const nextPhoto = computed(() => (hasNext.value ? collection.value[currentIndex.value + 1] : undefined))

const stage = computed(() => (photo.value?.stageId ? data.getStage(photo.value.stageId) : undefined))
const album = computed(() => (photo.value?.albumId ? data.getAlbum(photo.value.albumId) : undefined))
const place = computed(() =>
  photo.value?.location?.name ? data.places.find((p) => p.name === photo.value!.location!.name) : undefined,
)
const people = computed(() =>
  (photo.value?.people ?? [])
    .map((pid) => data.people.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p)),
)

function go(target?: { id: string }) {
  if (!target) return
  router.replace({ path: `/photo/${target.id}`, query: route.query })
}

function onDownload() {
  if (!photo.value) return
  const a = document.createElement('a')
  a.href = photo.value.src
  a.download = photo.value.caption ? `${photo.value.caption}.jpg` : `${photo.value.id}.jpg`
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function onShare() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    alert('链接已复制到剪贴板')
  } catch {
    downloadText(url, 'share-link.txt')
  }
}

const exifEntries = computed(() => {
  if (!photo.value?.exif) return []
  const e = photo.value.exif
  const entries: { icon: typeof Camera; label: string; value: string }[] = []
  if (e.camera) entries.push({ icon: Camera, label: '相机', value: e.camera })
  if (e.lens) entries.push({ icon: Focus, label: '镜头', value: e.lens })
  if (e.aperture) entries.push({ icon: Aperture, label: '光圈', value: e.aperture })
  if (e.shutter) entries.push({ icon: Clock, label: '快门', value: e.shutter })
  if (e.iso) entries.push({ icon: Gauge, label: 'ISO', value: String(e.iso) })
  if (e.focalLength) entries.push({ icon: Focus, label: '焦距', value: e.focalLength })
  return entries
})

const dimensions = computed(() => {
  if (!photo.value?.width || !photo.value?.height) return null
  return `${photo.value.width} × ${photo.value.height}`
})
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="space-y-4">
      <div class="aspect-[4/3] animate-pulse rounded-xl bg-secondary" />
      <div class="h-4 w-1/2 animate-pulse rounded bg-secondary" />
    </div>

    <template v-else-if="photo">
      <!-- 导航栏 -->
      <div class="mb-4 flex items-center justify-between">
        <button
          type="button"
          :disabled="!hasPrev"
          class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
          @click="go(prevPhoto)"
        >
          <ChevronLeft :size="14" /> 上一张
        </button>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary"
            aria-label="下载原图"
            @click="onDownload"
          >
            <Download :size="14" /> 下载
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary"
            aria-label="复制分享链接"
            @click="onShare"
          >
            <Share2 :size="14" /> 分享
          </button>
        </div>
        <button
          type="button"
          :disabled="!hasNext"
          class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
          @click="go(nextPhoto)"
        >
          下一张 <ChevronRight :size="14" />
        </button>
      </div>

      <!-- 主图 -->
      <div class="surface mb-8 overflow-hidden">
        <img
          :src="photo.src"
          :srcset="photo.srcset
            ? [
                photo.srcset.small && `${photo.srcset.small} 480w`,
                photo.srcset.medium && `${photo.srcset.medium} 800w`,
                photo.srcset.large && `${photo.srcset.large} 1200w`,
              ].filter(Boolean).join(', ')
            : undefined"
          sizes="(max-width: 768px) 100vw, 80vw"
          :alt="photo.caption || '照片'"
          class="max-h-[70vh] w-full object-contain"
        />
      </div>

      <!-- 元信息 -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <h1 class="font-display text-2xl font-semibold text-foreground">
            {{ photo.caption || '无标题' }}
          </h1>

          <div class="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span v-if="photo.date" class="inline-flex items-center gap-1">
              <Calendar :size="12" /> {{ formatDate(photo.date) }}
            </span>
            <router-link
              v-if="place"
              :to="`/place/${place.id}`"
              class="inline-flex items-center gap-1 hover:text-primary"
            >
              <MapPin :size="12" /> {{ place.name }}
            </router-link>
            <router-link
              v-if="album"
              :to="`/album/${album.id}`"
              class="inline-flex items-center gap-1 hover:text-primary"
            >
              <FolderOpen :size="12" /> {{ album.title }}
            </router-link>
            <router-link
              v-if="stage"
              :to="`/stage/${stage.id}`"
              class="inline-flex items-center gap-1 hover:text-primary"
            >
              <LayoutGrid :size="12" /> {{ stage.name }}
            </router-link>
            <span v-if="dimensions" class="inline-flex items-center gap-1">
              {{ dimensions }}
            </span>
          </div>

          <div v-if="photo.tags?.length" class="mt-4 flex flex-wrap gap-2">
            <router-link
              v-for="tag in photo.tags"
              :key="tag"
              :to="`/search?q=${encodeURIComponent(tag)}`"
              class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <Tag :size="10" />
              {{ tag }}
            </router-link>
          </div>
        </div>

        <div class="space-y-5">
          <div v-if="people.length > 0" class="surface p-5">
            <h2 class="mb-3 flex items-center gap-2 font-display text-sm text-foreground">
              <Users :size="14" /> 人物
            </h2>
            <div class="flex flex-wrap gap-2">
              <router-link
                v-for="person in people"
                :key="person.id"
                :to="`/person/${person.id}`"
                class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
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
          </div>

          <div v-if="exifEntries.length > 0" class="surface p-5">
            <h2 class="mb-3 flex items-center gap-2 font-display text-sm text-foreground">
              <Camera :size="14" /> EXIF
            </h2>
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="entry in exifEntries"
                :key="entry.label"
                class="flex items-start gap-2"
              >
                <component :is="entry.icon" class="mt-0.5 shrink-0 text-muted-foreground" :size="12" />
                <div>
                  <p class="text-[10px] text-muted-foreground">{{ entry.label }}</p>
                  <p class="text-xs font-medium text-foreground">{{ entry.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 未找到 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">未找到该照片</p>
      <router-link
        to="/timeline"
        class="mt-4 inline-block text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        ← 返回时间轴
      </router-link>
    </div>
  </div>
</template>
