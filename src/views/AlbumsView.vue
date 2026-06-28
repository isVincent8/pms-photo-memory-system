<script setup lang="ts">
/**
 * AlbumsView —— 相册列表页
 *
 * 展示所有相册卡片，包含封面、标题、日期、所属阶段与照片数量。
 */
import { computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { Images } from 'lucide-vue-next'

const data = useDataStore()

onMounted(() => {
  if (!data.loaded) data.load()
})

const albumsWithStats = computed(() =>
  data.albums.map((album) => {
    const photoCount = data.photos.filter((p) => p.albumId === album.id).length
    const stage = album.stageId ? data.getStage(album.stageId) : undefined
    return { album, photoCount, stage }
  }),
)
</script>

<template>
  <div class="page-container py-10 md:py-14">
    <header class="mb-10 animate-rise">
      <p class="font-display text-xs tracking-[0.3em] text-primary uppercase">Albums</p>
      <h1 class="section-title mt-2">相册</h1>
      <p class="mt-2 text-sm text-muted-foreground">按主题或时间整理的照片集</p>
    </header>

    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="surface h-64 animate-pulse" />
    </div>

    <!-- 相册网格 -->
    <div v-else-if="albumsWithStats.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="{ album, photoCount, stage } in albumsWithStats"
        :key="album.id"
        :to="`/album/${album.id}`"
        class="surface surface-hover group overflow-hidden"
      >
        <div class="relative aspect-[4/3] overflow-hidden bg-secondary">
          <img
            v-if="album.cover"
            :src="album.cover"
            :alt="album.title"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <Images :size="32" class="text-muted-foreground" />
          </div>
          <span
            class="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm"
          >
            {{ photoCount }} 张
          </span>
        </div>
        <div class="p-4">
          <h2 class="font-display text-lg font-semibold text-foreground">{{ album.title }}</h2>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span v-if="album.date">{{ album.date }}</span>
            <span v-if="stage">· {{ stage.name }}</span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 空状态 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">还没有相册数据</p>
    </div>
  </div>
</template>
