<script setup lang="ts">
/**
 * PlacesView —— 地点列表页
 *
 * 展示所有地点卡片，包含名称、经纬度、关联照片数与阶段数。
 */
import { computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { MapPin } from 'lucide-vue-next'

const data = useDataStore()

onMounted(() => {
  if (!data.loaded) data.load()
})

const placesWithStats = computed(() =>
  data.places.map((place) => {
    const photoCount = data.photos.filter((p) => p.location?.name === place.name).length
    const stageCount = place.stageIds?.length ?? 0
    return { place, photoCount, stageCount }
  }),
)
</script>

<template>
  <div class="page-container py-10 md:py-14">
    <header class="mb-10 animate-rise">
      <p class="font-display text-xs tracking-[0.3em] text-primary uppercase">Places</p>
      <h1 class="section-title mt-2">地点</h1>
      <p class="mt-2 text-sm text-muted-foreground">回忆驻足过的地方</p>
    </header>

    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="surface h-40 animate-pulse" />
    </div>

    <!-- 地点网格 -->
    <div
      v-else-if="placesWithStats.length > 0"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <router-link
        v-for="{ place, photoCount, stageCount } in placesWithStats"
        :key="place.id"
        :to="`/place/${place.id}`"
        class="surface surface-hover p-5"
      >
        <div class="flex items-start justify-between">
          <div>
            <h2 class="font-display text-lg font-semibold text-foreground">{{ place.name }}</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ place.location.latitude.toFixed(4) }}, {{ place.location.longitude.toFixed(4) }}
            </p>
          </div>
          <div class="rounded-lg bg-secondary p-2 text-muted-foreground">
            <MapPin :size="16" />
          </div>
        </div>
        <div class="mt-4 flex gap-3 text-[10px] text-muted-foreground">
          <span>{{ photoCount }} 张照片</span>
          <span>{{ stageCount }} 个阶段</span>
        </div>
      </router-link>
    </div>

    <!-- 空状态 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">还没有地点数据</p>
    </div>
  </div>
</template>
