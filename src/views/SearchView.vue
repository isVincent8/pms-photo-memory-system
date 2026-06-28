<script setup lang="ts">
/**
 * SearchView —— 全局搜索页
 *
 * 支持按关键词搜索阶段、相册、人物、地点、照片，并按类型筛选。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { formatDate } from '@/utils/dateUtils'
import { Search, X, Calendar, MapPin, Tag } from 'lucide-vue-next'
import type { Photo } from '@/types'

const data = useDataStore()
const route = useRoute()
const router = useRouter()

const q = ref(String(route.query.q ?? ''))
const type = ref(String(route.query.type ?? 'all'))

const types = [
  { key: 'all', label: '全部' },
  { key: 'stage', label: '阶段' },
  { key: 'album', label: '相册' },
  { key: 'person', label: '人物' },
  { key: 'place', label: '地点' },
  { key: 'photo', label: '照片' },
]

watch([q, type], () => {
  router.replace({ query: { q: q.value || undefined, type: type.value === 'all' ? undefined : type.value } })
})

function clear() {
  q.value = ''
}

const keyword = computed(() => q.value.trim().toLowerCase())

function match(...fields: (string | undefined)[]) {
  if (!keyword.value) return false
  return fields.some((f) => f?.toLowerCase().includes(keyword.value))
}

function joinTags(tags?: string[]) {
  return tags?.length ? tags.join(' ') : undefined
}

function personNames(ids?: string[]) {
  return ids
    ?.map((id) => data.people.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(' ')
}

function placeNames(names?: string[]) {
  return names?.join(' ')
}

function photoStageName(p: Photo) {
  return p.stageId ? data.getStage(p.stageId)?.name : undefined
}

function photoAlbumTitle(p: Photo) {
  return p.albumId ? data.getAlbum(p.albumId)?.title : undefined
}

const results = computed(() => {
  if (!keyword.value) return { stage: [], album: [], person: [], place: [], photo: [] }

  const stage =
    type.value === 'all' || type.value === 'stage'
      ? data.stages.filter((s) =>
          match(
            s.name,
            s.description,
            s.content,
            joinTags(s.tags),
            placeNames(s.locations),
            personNames(s.people),
          ),
        )
      : []

  const album =
    type.value === 'all' || type.value === 'album'
      ? data.albums.filter((a) =>
          match(
            a.title,
            a.content,
            a.location?.name,
            a.stageId ? data.getStage(a.stageId)?.name : undefined,
          ),
        )
      : []

  const person =
    type.value === 'all' || type.value === 'person'
      ? data.people.filter((p) => match(p.name, p.bio, p.content))
      : []

  const place =
    type.value === 'all' || type.value === 'place'
      ? data.places.filter((p) => match(p.name, p.content, p.location?.name))
      : []

  const photo =
    type.value === 'all' || type.value === 'photo'
      ? data.photos.filter((p) =>
          match(
            p.caption,
            p.location?.name,
            p.date ?? undefined,
            joinTags(p.tags),
            personNames(p.people),
            photoStageName(p),
            photoAlbumTitle(p),
          ),
        )
      : []

  return { stage, album, person, place, photo }
})

const counts = computed<Record<string, number>>(() => ({
  all: results.value.stage.length + results.value.album.length + results.value.person.length + results.value.place.length + results.value.photo.length,
  stage: results.value.stage.length,
  album: results.value.album.length,
  person: results.value.person.length,
  place: results.value.place.length,
  photo: results.value.photo.length,
}))

const total = computed(() => counts.value.all)
</script>

<template>
  <div class="page-container py-10 md:py-14">
    <header class="mb-8 animate-rise">
      <p class="font-display text-xs tracking-[0.3em] text-primary uppercase">Search</p>
      <h1 class="section-title mt-2">搜索</h1>
    </header>

    <!-- 搜索框 -->
    <div class="relative mb-6">
      <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="q"
        type="text"
        placeholder="搜索阶段、相册、人物、地点、照片..."
        class="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-10 text-sm text-foreground outline-none ring-primary placeholder:text-muted-foreground focus:border-primary focus:ring-1"
      />
      <button
        v-if="q"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
        @click="clear"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- 类型筛选 -->
    <div class="mb-8 flex flex-wrap gap-2">
      <button
        v-for="t in types"
        :key="t.key"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors"
        :class="
          type === t.key
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground hover:text-foreground'
        "
        @click="type = t.key"
      >
        {{ t.label }}
        <span
          v-if="keyword"
          class="rounded-full px-1.5 py-0.5 text-[10px]"
          :class="type === t.key ? 'bg-primary-foreground/20' : 'bg-secondary'"
        >
          {{ counts[t.key] }}
        </span>
      </button>
    </div>

    <!-- 结果 -->
    <div v-if="!keyword" class="py-24 text-center text-sm text-muted-foreground">
      输入关键词开始搜索
    </div>

    <div v-else-if="total === 0" class="py-24 text-center text-sm text-muted-foreground">
      未找到与 “{{ q }}” 相关的内容
    </div>

    <div v-else class="space-y-10">
      <section v-if="results.stage.length > 0">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">阶段</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <router-link
            v-for="item in results.stage"
            :key="item.id"
            :to="`/stage/${item.id}`"
            class="surface surface-hover p-4"
          >
            <h3 class="font-medium text-foreground">{{ item.name }}</h3>
            <p v-if="item.description" class="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {{ item.description }}
            </p>
            <div v-if="item.tags?.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="tag in item.tags.slice(0, 4)"
                :key="tag"
                class="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
              >
                <Tag :size="10" />
                {{ tag }}
              </span>
            </div>
          </router-link>
        </div>
      </section>

      <section v-if="results.album.length > 0">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">相册</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <router-link
            v-for="item in results.album"
            :key="item.id"
            :to="`/album/${item.id}`"
            class="surface surface-hover p-4"
          >
            <h3 class="font-medium text-foreground">{{ item.title }}</h3>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span v-if="item.date" class="inline-flex items-center gap-1">
                <Calendar :size="11" />
                {{ formatDate(item.date) }}
              </span>
              <span v-if="item.location?.name" class="inline-flex items-center gap-1">
                <MapPin :size="11" />
                {{ item.location.name }}
              </span>
            </div>
          </router-link>
        </div>
      </section>

      <section v-if="results.person.length > 0">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">人物</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <router-link
            v-for="item in results.person"
            :key="item.id"
            :to="`/person/${item.id}`"
            class="surface surface-hover flex items-center gap-3 p-4"
          >
            <div class="h-10 w-10 overflow-hidden rounded-full border border-border bg-secondary">
              <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="h-full w-full object-cover" />
            </div>
            <div>
              <h3 class="font-medium text-foreground">{{ item.name }}</h3>
              <p v-if="item.bio" class="line-clamp-1 text-xs text-muted-foreground">{{ item.bio }}</p>
            </div>
          </router-link>
        </div>
      </section>

      <section v-if="results.place.length > 0">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">地点</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <router-link
            v-for="item in results.place"
            :key="item.id"
            :to="`/place/${item.id}`"
            class="surface surface-hover p-4"
          >
            <h3 class="font-medium text-foreground">{{ item.name }}</h3>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ item.location.latitude.toFixed(4) }}, {{ item.location.longitude.toFixed(4) }}
            </p>
          </router-link>
        </div>
      </section>

      <section v-if="results.photo.length > 0">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">照片</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <router-link
            v-for="item in results.photo"
            :key="item.id"
            :to="{ path: `/photo/${item.id}`, query: { q: q } }"
            class="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
          >
            <img
              v-if="item.thumbnail || item.src"
              :src="item.thumbnail || item.src"
              :alt="item.caption || ''"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <p v-if="item.caption" class="line-clamp-2 text-left text-[10px] font-medium">
                {{ item.caption }}
              </p>
              <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-white/80">
                <span v-if="item.date">{{ formatDate(item.date) }}</span>
                <span v-if="item.location?.name">· {{ item.location.name }}</span>
              </p>
              <div v-if="item.tags?.length" class="mt-1 flex flex-wrap gap-1">
                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                  class="rounded bg-white/20 px-1 py-0.5 text-[9px]"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>
